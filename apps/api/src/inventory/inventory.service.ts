import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePurchaseOrderDto,
  CreateStockLocationDto,
  CreateSupplierDto,
  ReceiveGoodsDto,
  RecordMovementDto,
  ReserveKitDto,
} from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // LOCAIS DE ESTOQUE
  // ==========================================

  async listLocations(organizationId: string) {
    return this.prisma.stockLocation.findMany({
      where: { organizationId },
      include: {
        managerUser: { select: { id: true, name: true, email: true } },
        _count: { select: { balances: true, serializedAssets: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createLocation(organizationId: string, dto: CreateStockLocationDto) {
    const existing = await this.prisma.stockLocation.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (existing) {
      throw new BadRequestException(`Código de local ${dto.code} já existe nesta organização.`);
    }

    return this.prisma.stockLocation.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        type: dto.type ?? 'WAREHOUSE',
        address: dto.address,
        managerUserId: dto.managerUserId,
      },
      include: {
        managerUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // ==========================================
  // SALDOS DE ESTOQUE
  // ==========================================

  async listBalances(
    organizationId: string,
    query?: { locationId?: string; catalogItemId?: string; lowStockOnly?: boolean },
  ) {
    const where: Prisma.StockBalanceWhereInput = { organizationId };

    if (query?.locationId) where.locationId = query.locationId;
    if (query?.catalogItemId) where.catalogItemId = query.catalogItemId;

    const balances = await this.prisma.stockBalance.findMany({
      where,
      include: {
        catalogItem: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            manufacturer: true,
            model: true,
            unitOfMeasure: true,
            powerRatingWp: true,
            powerRatingKw: true,
            referenceCost: true,
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [{ catalogItem: { category: 'asc' } }, { catalogItem: { name: 'asc' } }],
    });

    if (query?.lowStockOnly) {
      return balances.filter(
        (b) => b.minStockAlert && Number(b.available) <= Number(b.minStockAlert),
      );
    }

    return balances;
  }

  // ==========================================
  // MOVIMENTAÇÕES (RAZÃO IMUTÁVEL & ATÔMICO)
  // ==========================================

  async listMovements(
    organizationId: string,
    query?: { catalogItemId?: string; locationId?: string; opportunityId?: string; limit?: number },
  ) {
    const where: Prisma.StockMovementWhereInput = { organizationId };

    if (query?.catalogItemId) where.catalogItemId = query.catalogItemId;
    if (query?.opportunityId) where.opportunityId = query.opportunityId;
    if (query?.locationId) {
      where.OR = [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }];
    }

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        catalogItem: { select: { id: true, sku: true, name: true, category: true } },
        fromLocation: { select: { id: true, code: true, name: true } },
        toLocation: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, code: true, title: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: query?.limit ? Number(query.limit) : 100,
    });
  }

  async recordMovement(organizationId: string, userId: string, dto: RecordMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      const quantity = new Prisma.Decimal(dto.quantity);
      const unitCost = dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : null;
      const totalCost = unitCost ? unitCost.mul(quantity) : null;

      // 1. Process movement based on type
      switch (dto.type) {
        case 'RECEIVE': {
          if (!dto.toLocationId) {
            throw new BadRequestException(
              'Local de destino (toLocationId) é obrigatório para RECEIVE.',
            );
          }

          const balance = await tx.stockBalance.findUnique({
            where: {
              organizationId_catalogItemId_locationId: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: dto.toLocationId,
              },
            },
          });

          if (balance) {
            const currentQty = balance.physicalOnHand;
            const currentAvgCost = balance.averageCost;
            const newQty = currentQty.add(quantity);

            // Média ponderada móvel
            let newAvgCost = currentAvgCost;
            if (unitCost && newQty.gt(0)) {
              newAvgCost = currentQty.mul(currentAvgCost).add(quantity.mul(unitCost)).div(newQty);
            }

            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                physicalOnHand: newQty,
                available: balance.available.add(quantity),
                averageCost: newAvgCost,
                version: { increment: 1 },
              },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: dto.toLocationId,
                physicalOnHand: quantity,
                available: quantity,
                averageCost: unitCost ?? 0,
              },
            });
          }
          break;
        }

        case 'TRANSFER_OUT':
        case 'CONSUME':
        case 'LOSS':
        case 'QUARANTINE': {
          if (!dto.fromLocationId) {
            throw new BadRequestException(
              `Local de origem (fromLocationId) é obrigatório para ${dto.type}.`,
            );
          }

          const balance = await tx.stockBalance.findUnique({
            where: {
              organizationId_catalogItemId_locationId: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: dto.fromLocationId,
              },
            },
          });

          if (!balance || balance.physicalOnHand.lt(quantity)) {
            throw new BadRequestException(
              `Saldo físico insuficiente no local para ${dto.type}. Saldo atual: ${balance?.physicalOnHand ?? 0}, solicitado: ${quantity}`,
            );
          }

          if (dto.type === 'CONSUME' && dto.opportunityId) {
            // Se consumo de reserva, reduz reserved e physicalOnHand
            const resItem = await tx.stockReservationItem.findFirst({
              where: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: dto.fromLocationId,
                reservation: { opportunityId: dto.opportunityId, status: 'ACTIVE' },
              },
            });

            if (resItem && resItem.quantityReserved.gte(quantity)) {
              await tx.stockReservationItem.update({
                where: { id: resItem.id },
                data: {
                  quantityReserved: resItem.quantityReserved.sub(quantity),
                  quantityConsumed: resItem.quantityConsumed.add(quantity),
                },
              });

              await tx.stockBalance.update({
                where: { id: balance.id },
                data: {
                  physicalOnHand: balance.physicalOnHand.sub(quantity),
                  reserved: balance.reserved.sub(quantity),
                  version: { increment: 1 },
                },
              });
              break;
            }
          }

          // Saída normal sem reserva prévia vinculada
          if (balance.available.lt(quantity)) {
            throw new BadRequestException(
              `Saldo disponível insuficiente no local. Disponível: ${balance.available}, solicitado: ${quantity}`,
            );
          }

          const updateData: Prisma.StockBalanceUpdateInput = {
            physicalOnHand: balance.physicalOnHand.sub(quantity),
            available: balance.available.sub(quantity),
            version: { increment: 1 },
          };

          if (dto.type === 'QUARANTINE') {
            updateData.blocked = balance.blocked.add(quantity);
            updateData.physicalOnHand = balance.physicalOnHand; // Mantém no físico, mas bloqueia
          }

          await tx.stockBalance.update({
            where: { id: balance.id },
            data: updateData,
          });
          break;
        }

        case 'TRANSFER_IN':
        case 'RETURN':
        case 'RELEASE': {
          if (!dto.toLocationId) {
            throw new BadRequestException(
              `Local de destino (toLocationId) é obrigatório para ${dto.type}.`,
            );
          }

          const balance = await tx.stockBalance.findUnique({
            where: {
              organizationId_catalogItemId_locationId: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: dto.toLocationId,
              },
            },
          });

          if (balance) {
            const updateData: Prisma.StockBalanceUpdateInput = {
              physicalOnHand: balance.physicalOnHand.add(quantity),
              available: balance.available.add(quantity),
              version: { increment: 1 },
            };

            if (dto.type === 'RELEASE') {
              updateData.blocked = Prisma.Decimal.max(0, balance.blocked.sub(quantity));
              updateData.physicalOnHand = balance.physicalOnHand; // Já estava no físico
            }

            await tx.stockBalance.update({
              where: { id: balance.id },
              data: updateData,
            });
          } else {
            await tx.stockBalance.create({
              data: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: dto.toLocationId,
                physicalOnHand: quantity,
                available: quantity,
                averageCost: unitCost ?? 0,
              },
            });
          }
          break;
        }

        case 'ADJUST': {
          const targetLoc = dto.toLocationId ?? dto.fromLocationId;
          if (!targetLoc) {
            throw new BadRequestException(
              'Local (toLocationId ou fromLocationId) é obrigatório para ADJUST.',
            );
          }

          const balance = await tx.stockBalance.findUnique({
            where: {
              organizationId_catalogItemId_locationId: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: targetLoc,
              },
            },
          });

          if (balance) {
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                physicalOnHand: balance.physicalOnHand.add(quantity),
                available: balance.available.add(quantity),
                version: { increment: 1 },
              },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                organizationId,
                catalogItemId: dto.catalogItemId,
                locationId: targetLoc,
                physicalOnHand: quantity,
                available: quantity,
                averageCost: unitCost ?? 0,
              },
            });
          }
          break;
        }

        default:
          throw new BadRequestException(`Tipo de movimento ${dto.type} não suportado.`);
      }

      // 2. Insert immutable movement
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          catalogItemId: dto.catalogItemId,
          type: dto.type,
          quantity,
          unitCost,
          totalCost,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          opportunityId: dto.opportunityId,
          purchaseOrderId: dto.purchaseOrderId,
          goodsReceiptId: dto.goodsReceiptId,
          notes: dto.notes,
          createdById: userId,
        },
      });

      // 3. Process Serial Numbers if provided
      if (dto.serialNumbers && dto.serialNumbers.length > 0) {
        for (const serial of dto.serialNumbers) {
          const targetLocation = dto.toLocationId ?? dto.fromLocationId;
          const status =
            dto.type === 'CONSUME'
              ? 'INSTALLED'
              : dto.type === 'LOSS' || dto.type === 'QUARANTINE'
                ? 'DEFECTIVE'
                : 'IN_STOCK';

          await tx.serializedAsset.upsert({
            where: {
              organizationId_serialNumber: {
                organizationId,
                serialNumber: serial,
              },
            },
            create: {
              organizationId,
              catalogItemId: dto.catalogItemId,
              serialNumber: serial,
              locationId: targetLocation,
              opportunityId: dto.opportunityId,
              goodsReceiptId: dto.goodsReceiptId,
              status,
              installedAt: dto.type === 'CONSUME' ? new Date() : null,
              notes: dto.notes,
            },
            update: {
              locationId: targetLocation,
              opportunityId: dto.opportunityId ?? undefined,
              status,
              installedAt: dto.type === 'CONSUME' ? new Date() : undefined,
              notes: dto.notes ?? undefined,
            },
          });
        }
      }

      return movement;
    });
  }

  // ==========================================
  // RESERVAS DE ESTOQUE POR PROJETO
  // ==========================================

  async listReservations(organizationId: string, opportunityId?: string) {
    const where: Prisma.StockReservationWhereInput = { organizationId };
    if (opportunityId) where.opportunityId = opportunityId;

    return this.prisma.stockReservation.findMany({
      where,
      include: {
        opportunity: {
          select: {
            id: true,
            code: true,
            title: true,
            customer: { select: { id: true, legalName: true, taxId: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            catalogItem: { select: { id: true, sku: true, name: true, category: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reserveKit(organizationId: string, userId: string, dto: ReserveKitDto) {
    return this.prisma.$transaction(async (tx) => {
      // Cria ou busca reserva existente
      let reservation = await tx.stockReservation.findUnique({
        where: { opportunityId: dto.opportunityId },
      });

      if (!reservation) {
        reservation = await tx.stockReservation.create({
          data: {
            organizationId,
            opportunityId: dto.opportunityId,
            createdById: userId,
            notes: dto.notes,
          },
        });
      }

      for (const item of dto.items) {
        const needed = new Prisma.Decimal(item.quantityNeeded);

        const balance = await tx.stockBalance.findUnique({
          where: {
            organizationId_catalogItemId_locationId: {
              organizationId,
              catalogItemId: item.catalogItemId,
              locationId: item.locationId,
            },
          },
        });

        if (!balance || balance.available.lt(needed)) {
          throw new BadRequestException(
            `Saldo disponível insuficiente para reservar o item. Disponível: ${balance?.available ?? 0}, Solicitado: ${needed}`,
          );
        }

        // Atualiza saldo: reserved sobe, available desce
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            reserved: balance.reserved.add(needed),
            available: balance.available.sub(needed),
            version: { increment: 1 },
          },
        });

        // Cria item de reserva
        await tx.stockReservationItem.create({
          data: {
            organizationId,
            reservationId: reservation.id,
            catalogItemId: item.catalogItemId,
            locationId: item.locationId,
            quantityNeeded: needed,
            quantityReserved: needed,
            status: 'RESERVED',
          },
        });
      }

      return tx.stockReservation.findUnique({
        where: { id: reservation.id },
        include: {
          items: {
            include: {
              catalogItem: true,
              location: true,
            },
          },
        },
      });
    });
  }

  async releaseReservation(organizationId: string, reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findFirst({
        where: { id: reservationId, organizationId },
        include: { items: true },
      });

      if (!reservation) throw new NotFoundException('Reserva não encontrada.');
      if (reservation.status === 'CANCELED') {
        throw new BadRequestException('Esta reserva já foi cancelada/liberada.');
      }

      for (const item of reservation.items) {
        if (item.quantityReserved.gt(0)) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              organizationId_catalogItemId_locationId: {
                organizationId,
                catalogItemId: item.catalogItemId,
                locationId: item.locationId,
              },
            },
          });

          if (balance) {
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                reserved: Prisma.Decimal.max(0, balance.reserved.sub(item.quantityReserved)),
                available: balance.available.add(item.quantityReserved),
                version: { increment: 1 },
              },
            });
          }

          await tx.stockReservationItem.update({
            where: { id: item.id },
            data: {
              quantityReserved: 0,
              status: 'RELEASED',
            },
          });
        }
      }

      return tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELED' },
      });
    });
  }

  // ==========================================
  // FORNECEDORES
  // ==========================================

  async listSuppliers(organizationId: string) {
    return this.prisma.supplier.findMany({
      where: { organizationId },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(organizationId: string, dto: CreateSupplierDto) {
    const existingCode = await this.prisma.supplier.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (existingCode) {
      throw new BadRequestException(`Código ${dto.code} já utilizado por outro fornecedor.`);
    }

    const existingDoc = await this.prisma.supplier.findUnique({
      where: {
        organizationId_documentNumber: { organizationId, documentNumber: dto.documentNumber },
      },
    });
    if (existingDoc) {
      throw new BadRequestException(
        `CNPJ/CPF ${dto.documentNumber} já cadastrado para outro fornecedor.`,
      );
    }

    return this.prisma.supplier.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        tradeName: dto.tradeName,
        documentNumber: dto.documentNumber,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        category: dto.category ?? 'SOLAR_EQUIPMENT',
        leadTimeDays: dto.leadTimeDays ?? 7,
        paymentTerms: dto.paymentTerms,
      },
    });
  }

  // ==========================================
  // ORDENS DE COMPRA
  // ==========================================

  async listPurchaseOrders(organizationId: string, status?: string) {
    const where: Prisma.PurchaseOrderWhereInput = { organizationId };
    if (status) where.status = status;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, code: true, name: true, documentNumber: true } },
        opportunity: { select: { id: true, code: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            catalogItem: { select: { id: true, sku: true, name: true, category: true } },
          },
        },
        goodsReceipts: {
          select: { id: true, code: true, invoiceNumber: true, receivedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchaseOrder(organizationId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const existingCode = await this.prisma.purchaseOrder.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (existingCode) {
      throw new BadRequestException(`Código de pedido ${dto.code} já existe.`);
    }

    let totalAmount = new Prisma.Decimal(0);
    const itemsData = dto.items.map((item) => {
      const qty = new Prisma.Decimal(item.quantityOrdered);
      const cost = new Prisma.Decimal(item.unitCost);
      const lineTotal = qty.mul(cost);
      totalAmount = totalAmount.add(lineTotal);
      return {
        organizationId,
        catalogItemId: item.catalogItemId,
        quantityOrdered: qty,
        unitCost: cost,
        totalCost: lineTotal,
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        supplierId: dto.supplierId,
        code: dto.code,
        status: 'ORDERED',
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        totalAmount,
        notes: dto.notes,
        opportunityId: dto.opportunityId,
        createdById: userId,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: { include: { catalogItem: true } },
      },
    });
  }

  async approvePurchaseOrder(organizationId: string, userId: string, purchaseOrderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
    });
    if (!order) throw new NotFoundException('Ordem de compra não encontrada.');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(`Apenas pedidos em DRAFT podem ser aprovados.`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'ORDERED',
        approvedById: userId,
      },
    });
  }

  // ==========================================
  // RECEBIMENTO FÍSICO DE COMPRAS (GOODS RECEIPT)
  // ==========================================

  async receiveGoods(organizationId: string, userId: string, dto: ReceiveGoodsDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, organizationId },
        include: { items: true },
      });

      if (!order) throw new NotFoundException('Ordem de compra não encontrada.');
      if (['RECEIVED', 'CANCELED'].includes(order.status)) {
        throw new BadRequestException(`Pedido com status ${order.status} não pode receber itens.`);
      }

      // 1. Cria recibo de entrega
      const receipt = await tx.goodsReceipt.create({
        data: {
          organizationId,
          purchaseOrderId: dto.purchaseOrderId,
          locationId: dto.locationId,
          code: dto.code,
          invoiceNumber: dto.invoiceNumber,
          notes: dto.notes,
          receivedById: userId,
        },
      });

      let allCompleted = true;

      // 2. Para cada item recebido, cria GoodsReceiptItem e movimento de entrada
      for (const item of dto.items) {
        const qtyReceived = new Prisma.Decimal(item.quantityReceived);
        const unitCost = new Prisma.Decimal(item.unitCost);

        await tx.goodsReceiptItem.create({
          data: {
            organizationId,
            goodsReceiptId: receipt.id,
            catalogItemId: item.catalogItemId,
            quantityReceived: qtyReceived,
            unitCost,
          },
        });

        // Atualiza item do pedido de compra
        const orderItem = order.items.find((i) => i.catalogItemId === item.catalogItemId);
        if (orderItem) {
          const newQtyRec = orderItem.quantityReceived.add(qtyReceived);
          await tx.purchaseOrderItem.update({
            where: { id: orderItem.id },
            data: { quantityReceived: newQtyRec },
          });

          if (newQtyRec.lt(orderItem.quantityOrdered)) {
            allCompleted = false;
          }
        }

        // Movimento de estoque: RECEIVE no depósito de destino
        const balance = await tx.stockBalance.findUnique({
          where: {
            organizationId_catalogItemId_locationId: {
              organizationId,
              catalogItemId: item.catalogItemId,
              locationId: dto.locationId,
            },
          },
        });

        if (balance) {
          const currentQty = balance.physicalOnHand;
          const currentAvgCost = balance.averageCost;
          const newQty = currentQty.add(qtyReceived);

          let newAvgCost = currentAvgCost;
          if (newQty.gt(0)) {
            newAvgCost = currentQty.mul(currentAvgCost).add(qtyReceived.mul(unitCost)).div(newQty);
          }

          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              physicalOnHand: newQty,
              available: balance.available.add(qtyReceived),
              averageCost: newAvgCost,
              version: { increment: 1 },
            },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              organizationId,
              catalogItemId: item.catalogItemId,
              locationId: dto.locationId,
              physicalOnHand: qtyReceived,
              available: qtyReceived,
              averageCost: unitCost,
            },
          });
        }

        // Grava movimento imutável
        await tx.stockMovement.create({
          data: {
            organizationId,
            catalogItemId: item.catalogItemId,
            type: 'RECEIVE',
            quantity: qtyReceived,
            unitCost,
            totalCost: qtyReceived.mul(unitCost),
            toLocationId: dto.locationId,
            purchaseOrderId: dto.purchaseOrderId,
            goodsReceiptId: receipt.id,
            notes: `Recebimento NF ${dto.invoiceNumber ?? receipt.code}`,
            createdById: userId,
          },
        });

        // Cadastro de seriais unitários
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          for (const serial of item.serialNumbers) {
            await tx.serializedAsset.upsert({
              where: {
                organizationId_serialNumber: {
                  organizationId,
                  serialNumber: serial,
                },
              },
              create: {
                organizationId,
                catalogItemId: item.catalogItemId,
                serialNumber: serial,
                locationId: dto.locationId,
                goodsReceiptId: receipt.id,
                status: 'IN_STOCK',
                notes: `Recebido via ${receipt.code}`,
              },
              update: {
                locationId: dto.locationId,
                goodsReceiptId: receipt.id,
                status: 'IN_STOCK',
              },
            });
          }
        }
      }

      // Atualiza status da ordem de compra
      await tx.purchaseOrder.update({
        where: { id: dto.purchaseOrderId },
        data: {
          status: allCompleted ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
        },
      });

      return receipt;
    });
  }

  // ==========================================
  // ATIVOS SERIALIZADOS (INVERSORES E MÓDULOS)
  // ==========================================

  async listSerializedAssets(
    organizationId: string,
    query?: { catalogItemId?: string; locationId?: string; status?: string; search?: string },
  ) {
    const where: Prisma.SerializedAssetWhereInput = { organizationId };

    if (query?.catalogItemId) where.catalogItemId = query.catalogItemId;
    if (query?.locationId) where.locationId = query.locationId;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.serialNumber = { contains: query.search, mode: 'insensitive' };
    }

    return this.prisma.serializedAsset.findMany({
      where,
      include: {
        catalogItem: {
          select: { id: true, sku: true, name: true, category: true, manufacturer: true },
        },
        location: { select: { id: true, code: true, name: true } },
        opportunity: { select: { id: true, code: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
