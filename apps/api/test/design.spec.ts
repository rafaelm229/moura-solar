import { describe, expect, it } from 'vitest';

describe('SPEC-005 Design & Engineering Calculations', () => {
  describe('Consumo e Histórico da UC', () => {
    it('calcula média mensal exata para n meses válidos e sinaliza histórico incompleto quando n < 12', () => {
      const readings = [450.0, 520.5, 480.0, 610.5, 500.0, 490.0]; // 6 meses
      const validMonthsCount = readings.length;
      const sumKwh = readings.reduce((acc, v) => acc + v, 0);
      const averageMonthlyKwh = Math.round((sumKwh / validMonthsCount) * 100) / 100;
      const hasIncompleteHistory = validMonthsCount < 12;

      expect(validMonthsCount).toBe(6);
      expect(hasIncompleteHistory).toBe(true);
      expect(averageMonthlyKwh).toBe(508.5);
      expect(Math.round(averageMonthlyKwh * 12 * 100) / 100).toBe(6102.0);
    });

    it('identifica histórico completo quando 12 competências estão presentes', () => {
      const readings = Array(12).fill(500.0);
      const validMonthsCount = readings.length;
      const sumKwh = readings.reduce((acc, v) => acc + v, 0);
      const averageMonthlyKwh = sumKwh / validMonthsCount;

      expect(validMonthsCount).toBe(12);
      expect(validMonthsCount < 12).toBe(false);
      expect(averageMonthlyKwh).toBe(500.0);
    });
  });

  describe('Dimensionamento Técnico Solar (kWp, Geração e Relação DC/AC)', () => {
    it('calcula potência DC a partir da quantidade e potência unitária em Wp', () => {
      const moduleQuantity = 25;
      const modulePowerWp = 630;
      const dcPowerKwp = (moduleQuantity * modulePowerWp) / 1000;

      // SPEC-005 Item 3: 25 módulos × 630 Wp = 15.750 Wp = 15,75 kWp
      expect(dcPowerKwp).toBe(15.75);
    });

    it('calcula geração estimada mensal e anual com produtividade específica', () => {
      const dcPowerKwp = 15.75;
      const specificYield = 135.0; // kWh/kWp/mês
      const estimatedMonthlyKwh = Math.round(dcPowerKwp * specificYield * 100) / 100;
      const estimatedAnnualKwh = Math.round(estimatedMonthlyKwh * 12 * 100) / 100;

      expect(estimatedMonthlyKwh).toBe(2126.25);
      expect(estimatedAnnualKwh).toBe(25515.0);
    });

    it('calcula relação DC/AC (overload do inversor)', () => {
      const dcPowerKwp = 15.75;
      const acPowerKw = 12.0;
      const dcAcRatio = Math.round((dcPowerKwp / acPowerKw) * 100) / 100;

      expect(dcAcRatio).toBe(1.31);
    });

    it('sugere quantidade inteira mínima de módulos para atingir a meta de geração', () => {
      const targetMonthlyKwh = 2000.0;
      const specificYield = 135.0;
      const modulePowerWp = 630;

      const rawDcKwp = targetMonthlyKwh / specificYield; // ~14.8148 kWp
      const suggestedModuleQuantity = Math.ceil((rawDcKwp * 1000) / modulePowerWp);
      const actualDcPowerKwp = (suggestedModuleQuantity * modulePowerWp) / 1000;
      const actualEstimatedMonthlyKwh = Math.round(actualDcPowerKwp * specificYield * 100) / 100;

      expect(suggestedModuleQuantity).toBe(24);
      expect(actualDcPowerKwp).toBe(15.12);
      expect(actualEstimatedMonthlyKwh).toBe(2041.2);
      expect(actualEstimatedMonthlyKwh).toBeGreaterThanOrEqual(targetMonthlyKwh);
    });
  });

  describe('Cálculos Financeiros: Markup sobre Custo vs Margem Bruta sobre Preço', () => {
    it('diferencia explicitamente markup e margem (SPEC-005 item 8 e 9)', () => {
      // Exemplo da especificação: R$ 10.000 de custo com 100% de markup produz R$ 20.000 e 50% de margem, não 100% de margem
      const totalEstimatedCost = 10000.0;
      const markupPercent = 100.0;

      const priceBeforeDiscount = totalEstimatedCost * (1 + markupPercent / 100);
      const discountAmount = 0.0;
      const finalPrice = priceBeforeDiscount - discountAmount;

      const grossMarginAmount = finalPrice - totalEstimatedCost;
      const grossMarginPercent = (grossMarginAmount / finalPrice) * 100;

      expect(priceBeforeDiscount).toBe(20000.0);
      expect(finalPrice).toBe(20000.0);
      expect(grossMarginAmount).toBe(10000.0);
      expect(grossMarginPercent).toBe(50.0);
    });

    it('calcula preço com desconto e margem resultante', () => {
      const totalEstimatedCost = 12000.0;
      const markupPercent = 40.0; // Preço sem desconto = 16.800

      const priceBeforeDiscount = totalEstimatedCost * (1 + markupPercent / 100);
      const discountAmount = 800.0;
      const finalPrice = priceBeforeDiscount - discountAmount; // 16.000

      const grossMarginAmount = finalPrice - totalEstimatedCost; // 4.000
      const grossMarginPercent = Math.round((grossMarginAmount / finalPrice) * 10000) / 100; // 25.0%

      expect(priceBeforeDiscount).toBe(16800.0);
      expect(finalPrice).toBe(16000.0);
      expect(grossMarginAmount).toBe(4000.0);
      expect(grossMarginPercent).toBe(25.0);
    });

    it('detecta violação de alçada mínima quando margem é inferior a 20%', () => {
      const totalEstimatedCost = 10000.0;
      const markupPercent = 20.0; // Preço = 12.000
      const finalPrice = totalEstimatedCost * (1 + markupPercent / 100);
      const grossMarginPercent = ((finalPrice - totalEstimatedCost) / finalPrice) * 100; // 16.67%

      const MINIMUM_MARGIN_THRESHOLD = 20.0;
      const isBelowThreshold = grossMarginPercent < MINIMUM_MARGIN_THRESHOLD;

      expect(grossMarginPercent).toBeCloseTo(16.67, 2);
      expect(isBelowThreshold).toBe(true);
    });
  });
});
