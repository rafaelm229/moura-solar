'use client';
import { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Icon } from '../../components/icons/material-symbol';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import type { Schemas } from '@moura-solar/api-client';

export type DossierDocument = Schemas['DossierDocumentViewDto'];
export type Representative = Schemas['RepresentativeViewDto'];
type DossierCategoryType = Schemas['CreateDocumentUploadDto']['category'];
type DeclaredMimeType = Schemas['CreateDocumentUploadDto']['declaredMime'];
type RepresentativeRoleType = Schemas['CustomerRepresentativeDto']['role'];

interface CustomerDossierProps {
  customerId: string;
  opportunityId?: string;
  utilityUnitId?: string;
  projectId?: string;
  title?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'Todos os Documentos',
  IDENTITY: 'Identidade (PF)',
  CORPORATE: 'Societário (PJ)',
  REPRESENTATION: 'Procurações / Representação',
  UTILITY_BILL: 'Contas de Energia',
  UC_DOCUMENT: 'Documentos da UC',
  COMMERCIAL_PROPOSAL: 'Propostas Comerciais',
  CONTRACT_ANNEX: 'Contratos & Aditivos',
  PHOTO_BEFORE: 'Fotos (Antes)',
  PHOTO_DURING: 'Fotos (Execução)',
  PHOTO_AFTER: 'Fotos (Após)',
  ART: 'Engenharia & ART',
  HOMOLOGATION: 'Homologação',
  DELIVERY_REPORT: 'Termo de Entrega',
  OTHER: 'Outros Documentos',
};

const PERSISTENCE_LABELS: Record<string, string> = {
  PENDING_UPLOAD: 'Aguardando arquivo',
  READY: 'Pronto',
  QUARANTINED: 'Verificação pendente',
  UPLOAD_FAILED: 'Falha no envio',
  MISSING: 'Arquivo indisponível',
  REJECTED: 'Arquivo rejeitado',
  CANCELED: 'Envio cancelado',
};

const REPRESENTATIVE_ROLES: Record<string, string> = {
  LEGAL_REPRESENTATIVE: 'Representante Legal',
  ATTORNEY: 'Procurador',
  TECHNICAL_RESPONSIBLE: 'Responsável Técnico',
  FINANCIAL_CONTACT: 'Contato Financeiro',
  OTHER: 'Outro',
};

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function CustomerDossier({
  customerId,
  opportunityId,
  utilityUnitId,
  projectId,
  title = 'Dossiê Documental Permanente',
}: CustomerDossierProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const commandKeys = useRef(new Map<string, string>());
  const idempotency = (operation: string, payload: unknown) => {
    const fingerprint = `${operation}:${JSON.stringify(payload)}`;
    let key = commandKeys.current.get(fingerprint);
    if (!key) {
      key = crypto.randomUUID();
      commandKeys.current.set(fingerprint, key);
    }
    return { 'idempotency-key': key };
  };
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [documentToArchive, setDocumentToArchive] = useState<DossierDocument | null>(null);
  const [documentToReplace, setDocumentToReplace] = useState<DossierDocument | null>(null);
  const [documentToComplete, setDocumentToComplete] = useState<DossierDocument | null>(null);
  const frozenDocument = documentToComplete ?? documentToReplace;
  const [historyDocument, setHistoryDocument] = useState<DossierDocument | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  // Upload form state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<string>('UTILITY_BILL');
  const [docPurpose, setDocPurpose] = useState('');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  // Representative form state
  const [repName, setRepName] = useState('');
  const [repDoc, setRepDoc] = useState('');
  const [repRole, setRepRole] = useState('LEGAL_REPRESENTATIVE');

  // Permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canUpload = me.data ? allows(me.data, 'documents:upload', false) : false;
  const canReadIdentity = me.data ? allows(me.data, 'documents:identity_read', false) : false;
  const canRead = me.data ? allows(me.data, 'documents:read', false) : false;

  // Documents query
  const documentsQuery = useQuery({
    queryKey: [
      'dossier-documents',
      customerId,
      selectedCategory,
      opportunityId,
      utilityUnitId,
      projectId,
    ],
    queryFn: async () => {
      return result(
        api.GET('/api/v1/customers/{customerId}/documents', {
          params: {
            path: { customerId },
            query: {
              category: selectedCategory === 'ALL' ? undefined : selectedCategory,
              opportunityId: opportunityId || undefined,
              utilityUnitId: utilityUnitId || undefined,
              projectId: projectId || undefined,
            },
          },
        }),
      );
    },
    enabled: !!customerId && canRead,
  });

  // Representatives query
  const repsQuery = useQuery({
    queryKey: ['customer-representatives', customerId],
    queryFn: async () => {
      return result(
        api.GET('/api/v1/customers/{customerId}/representatives', {
          params: { path: { customerId } },
        }),
      );
    },
    enabled: !!customerId && canReadIdentity,
  });

  const contextQuery = useQuery({
    queryKey: ['dossier-upload-context', customerId],
    queryFn: () =>
      result(
        api.GET('/api/v1/customers/{customerId}/document-context', {
          params: { path: { customerId } },
        }),
      ),
    enabled: canUpload,
  });

  const historyQuery = useQuery({
    queryKey: ['dossier-history', historyDocument?.id],
    queryFn: () =>
      result(
        api.GET('/api/v1/documents/{documentId}/history', {
          params: { path: { documentId: historyDocument!.id } },
        }),
      ),
    enabled: !!historyDocument,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Nenhum arquivo selecionado.');
      }
      if (!fileBase64) {
        throw new Error('Processando arquivo, aguarde um instante e tente novamente.');
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        throw new Error('O arquivo excede o limite máximo de 20 MiB.');
      }

      if (documentToComplete?.currentVersion) {
        const version = documentToComplete.currentVersion;
        return result(
          api.POST('/api/v1/document-uploads/{versionId}/complete', {
            params: {
              path: { versionId: version.id },
              header: idempotency('complete', [version.id, fileBase64]),
            },
            body: { expectedVersion: version.versionNumber, fileBase64 },
          }),
        );
      }
      if (documentToReplace) {
        return result(
          api.POST('/api/v1/documents/{documentId}/versions', {
            params: {
              path: { documentId: documentToReplace.id },
              header: idempotency('replace', [
                documentToReplace.id,
                documentToReplace.metadataVersion,
                selectedFile.name,
                fileBase64,
              ]),
            },
            body: {
              expectedVersion: documentToReplace.metadataVersion,
              title: documentToReplace.title,
              category: documentToReplace.category as DossierCategoryType,
              fileName: selectedFile.name,
              declaredMime: selectedFile.type as DeclaredMimeType,
              fileSize: selectedFile.size,
              fileBase64,
            },
          }),
        );
      }
      return result(
        api.POST('/api/v1/customers/{customerId}/document-uploads', {
          params: {
            path: { customerId },
            header: idempotency('upload', [
              customerId,
              docTitle,
              docCategory,
              docPurpose,
              selectedFile.name,
              fileBase64,
              opportunityId,
              utilityUnitId,
              projectId,
              selectedWorkOrder,
              selectedOpportunity,
            ]),
          },
          body: {
            title: docTitle.trim(),
            category: docCategory as DossierCategoryType,
            fileName: selectedFile.name,
            declaredMime: (selectedFile.type || 'application/pdf') as DeclaredMimeType,
            fileSize: selectedFile.size,
            fileBase64,
            purpose: docPurpose.trim() || undefined,
            opportunityId: opportunityId || selectedOpportunity || undefined,
            utilityUnitId: utilityUnitId || undefined,
            projectId: projectId || undefined,
            workOrderId: selectedWorkOrder || undefined,
          },
        }),
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ['dossier-documents', customerId] }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['dossier-documents', customerId] });
      setUploadNotice(
        doc.currentVersion?.persistenceState === 'READY'
          ? 'Documento verificado e disponível.'
          : 'Arquivo registrado, mas ainda indisponível. Verifique a pendência de validação no dossiê.',
      );
      commandKeys.current.clear();
      setIsUploadModalOpen(false);
      resetUploadForm();
    },
  });

  // Add Representative mutation
  const addRepMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/customers/{customerId}/representatives', {
          params: {
            path: { customerId },
            header: idempotency('representative', [customerId, repName, repDoc, repRole]),
          },
          body: {
            name: repName.trim(),
            documentNumber: repDoc.trim() || undefined,
            role: repRole as RepresentativeRoleType,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-representatives', customerId] });
      setIsRepModalOpen(false);
      setRepName('');
      setRepDoc('');
      setRepRole('LEGAL_REPRESENTATIVE');
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (docId: string) => {
      return result(
        api.POST('/api/v1/documents/{documentId}/archive', {
          params: {
            path: { documentId: docId },
            header: idempotency('archive', [
              docId,
              documentToArchive?.metadataVersion,
              archiveReason,
            ]),
          },
          body: {
            expectedVersion: documentToArchive?.metadataVersion ?? 1,
            reason: archiveReason.trim() || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossier-documents', customerId] });
      setDocumentToArchive(null);
      setArchiveReason('');
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (versionId: string) =>
      result(
        api.POST('/api/v1/document-uploads/{versionId}/reconcile', {
          params: { path: { versionId }, header: idempotency('reconcile', versionId) },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dossier-documents', customerId] }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileBase64('');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFileError('Arquivo muito grande. Limite máximo: 20 MiB.');
      setSelectedFile(null);
      setFileBase64('');
      return;
    }

    setSelectedFile(file);
    if (!docTitle) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setDocTitle(nameWithoutExt);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Index = resultStr.indexOf(';base64,');
      if (base64Index !== -1) {
        setFileBase64(resultStr.substring(base64Index + 8));
      } else {
        setFileBase64(resultStr);
      }
    };
    reader.onerror = () => {
      setFileError('Erro ao ler conteúdo do arquivo no navegador.');
    };
    reader.readAsDataURL(file);
  };

  const resetUploadForm = () => {
    setDocumentToReplace(null);
    setDocumentToComplete(null);
    setDocTitle('');
    setDocCategory(
      contextQuery.data?.categories.includes('UTILITY_BILL')
        ? 'UTILITY_BILL'
        : (contextQuery.data?.categories[0] ?? 'UTILITY_BILL'),
    );
    setSelectedWorkOrder('');
    setSelectedOpportunity('');
    setDocPurpose('');
    setSelectedFile(null);
    setFileBase64('');
    setFileError(null);
  };

  const handleView = (doc: DossierDocument) => {
    if (!doc.currentVersion) return;
    if (!doc.contentUrl) return;
    const url = `${doc.contentUrl}?purpose=VIEW`;
    window.open(url, '_blank');
  };

  const handleDownload = (doc: DossierDocument) => {
    if (!doc.currentVersion) return;
    if (!doc.contentUrl) return;
    const url = `${doc.contentUrl}?purpose=DOWNLOAD`;
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.currentVersion.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const documents = (documentsQuery.data || []).filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.currentVersion?.originalName.toLowerCase().includes(q)
    );
  });

  const reps = repsQuery.data || [];

  return (
    <div className="dossier-container" style={{ display: 'grid', gap: '1.5rem', width: '100%' }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="folder" size={24} style={{ color: 'var(--brand-primary, #087443)' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>{title}</h3>
          </div>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.85rem',
              color: 'var(--color-text-muted, #555)',
            }}
          >
            Documentos e evidências do cliente, disponíveis ao longo dos seus projetos.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            maxWidth: '100%',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {canUpload && (
            <>
              {canReadIdentity && (
                <Button
                  variant="outline"
                  size="sm"
                  icon="person"
                  onClick={() => setIsRepModalOpen(true)}
                >
                  + Representante
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon="upload_file"
                disabled={!contextQuery.data}
                onClick={() => {
                  resetUploadForm();
                  setIsUploadModalOpen(true);
                }}
              >
                Novo Documento
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Customer Representatives summary bar if exists */}
      {reps.length > 0 && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--color-surface-subtle, #f8fbf9)',
            border: '1px solid var(--color-border-subtle, #e2ece6)',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
          >
            <Icon name="badge" size={18} style={{ color: 'var(--brand-primary, #087443)' }} />
            <strong style={{ fontSize: '0.875rem' }}>Representantes Cadastrados:</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {reps.map((rep) => (
              <span
                key={rep.id}
                className="badge"
                style={{
                  background: 'var(--color-surface, #fff)',
                  border: '1px solid var(--color-border, #ccc)',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  gap: '0.4rem',
                  alignItems: 'center',
                }}
              >
                <strong>{rep.name}</strong> ({REPRESENTATIVE_ROLES[rep.role] || rep.role})
                {typeof rep.documentNumber === 'string' && rep.documentNumber && (
                  <span style={{ color: 'var(--color-text-muted, #666)' }}>
                    • Doc: {rep.documentNumber}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            aria-label="Filtrar categoria documental"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border, #ccc)',
              fontSize: '0.875rem',
              background: 'var(--color-surface, #fff)',
            }}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <input
            aria-label="Buscar documentos"
            type="text"
            placeholder="Buscar por nome ou arquivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border, #ccc)',
              fontSize: '0.875rem',
              minWidth: '240px',
            }}
          />
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #666)' }}>
          {documents.length} documento{documents.length === 1 ? '' : 's'} encontrado
          {documents.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Document List / Grid */}
      {canRead && documentsQuery.isPending && (
        <div
          style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted, #666)' }}
        >
          Carregando acervo documental...
        </div>
      )}

      {documentsQuery.isError && <Feedback error={documentsQuery.error} />}

      {canRead &&
        !documentsQuery.isPending &&
        !documentsQuery.isError &&
        documents.length === 0 && (
          <div
            className="card"
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--color-text-muted, #666)',
              border: '1px dashed var(--color-border, #ccc)',
            }}
          >
            <Icon
              name="folder"
              size={48}
              style={{ color: 'var(--color-border, #ccc)', marginBottom: '0.75rem' }}
            />
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-primary, #111)' }}>
              Nenhum documento encontrado no dossiê
            </h4>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem' }}>
              {selectedCategory !== 'ALL'
                ? `Não há arquivos registrados na categoria "${CATEGORY_LABELS[selectedCategory]}".`
                : 'Faça upload de contas de energia, procurações, propostas ou laudos técnicos.'}
            </p>
            {canUpload && (
              <Button
                variant="primary"
                size="sm"
                icon="upload_file"
                disabled={!contextQuery.data}
                onClick={() => {
                  resetUploadForm();
                  setIsUploadModalOpen(true);
                }}
              >
                Fazer Primeiro Upload
              </Button>
            )}
          </div>
        )}

      {contextQuery.isError && <Feedback error={contextQuery.error} />}
      {reconcileMutation.isError && <Feedback error={reconcileMutation.error} />}
      {uploadNotice && <p role="status">{uploadNotice}</p>}
      {!documentsQuery.isPending && documents.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
          }}
        >
          {documents.map((doc) => {
            const v = doc.currentVersion;
            const isProposalOrContract =
              doc.origin === 'PROPOSAL_DOCUMENT' || doc.origin === 'CONTRACT_DOCUMENT';

            return (
              <div
                key={doc.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  border: '1px solid var(--color-border, #e0e0e0)',
                  borderRadius: '8px',
                  background: 'var(--color-surface, #fff)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div>
                  {/* Category & Status header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        background:
                          doc.origin === 'DOSSIER'
                            ? 'rgba(8, 116, 67, 0.1)'
                            : doc.origin === 'PROPOSAL_DOCUMENT'
                              ? 'rgba(33, 150, 243, 0.1)'
                              : 'rgba(156, 39, 176, 0.1)',
                        color:
                          doc.origin === 'DOSSIER'
                            ? '#087443'
                            : doc.origin === 'PROPOSAL_DOCUMENT'
                              ? '#1565c0'
                              : '#6a1b9a',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        background:
                          doc.status === 'ARCHIVED'
                            ? 'rgba(158, 158, 158, 0.15)'
                            : v?.persistenceState === 'READY'
                              ? 'rgba(76, 175, 80, 0.15)'
                              : 'rgba(255, 152, 0, 0.15)',
                        color:
                          doc.status === 'ARCHIVED'
                            ? '#616161'
                            : v?.persistenceState === 'READY'
                              ? '#2e7d32'
                              : '#ef6c00',
                        fontWeight: 500,
                      }}
                    >
                      {doc.status === 'ARCHIVED'
                        ? 'Arquivado'
                        : v?.persistenceState === 'READY'
                          ? 'Pronto'
                          : 'Pendente'}
                    </span>
                  </div>

                  {/* Title & Purpose */}
                  <h4
                    style={{
                      margin: '0 0 0.4rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: 'var(--color-text-primary, #111)',
                    }}
                  >
                    {doc.title}
                  </h4>

                  {typeof doc.purpose === 'string' && doc.purpose && (
                    <p
                      style={{
                        margin: '0 0 0.75rem',
                        fontSize: '0.8rem',
                        color: 'var(--color-text-muted, #666)',
                        lineHeight: 1.4,
                      }}
                    >
                      {doc.purpose}
                    </p>
                  )}

                  {/* File Metadata */}
                  {v && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted, #555)',
                        background: 'var(--color-surface-subtle, #f9f9f9)',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        display: 'grid',
                        gap: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {v.originalName}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          {formatBytes(v.fileSize)} • v{v.versionNumber}
                        </span>
                        <span>{formatDate(v.createdAt)}</span>
                      </div>
                      {v.sha256 && v.sha256 !== 'pending' && (
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            color: 'var(--color-text-secondary, #777)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`SHA-256: ${v.sha256}`}
                        >
                          SHA: {v.sha256.substring(0, 16)}…
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--color-border-subtle, #eee)',
                    paddingTop: '0.75rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="visibility"
                      onClick={() => handleView(doc)}
                      disabled={!doc.contentUrl || !v || v.persistenceState !== 'READY'}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="download"
                      onClick={() => handleDownload(doc)}
                      disabled={!doc.contentUrl || !v || v.persistenceState !== 'READY'}
                    >
                      Baixar
                    </Button>
                  </div>

                  {!isProposalOrContract && (
                    <Button variant="secondary" size="sm" onClick={() => setHistoryDocument(doc)}>
                      Histórico
                    </Button>
                  )}
                  {canUpload && !isProposalOrContract && doc.status === 'ACTIVE' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        resetUploadForm();
                        setDocumentToReplace(doc);
                        setDocTitle(doc.title);
                        setDocCategory(doc.category);
                        setDocPurpose(doc.purpose ?? '');
                        setIsUploadModalOpen(true);
                      }}
                    >
                      Substituir
                    </Button>
                  )}
                  {canUpload &&
                    !isProposalOrContract &&
                    doc.status === 'ACTIVE' &&
                    v &&
                    ['PENDING_UPLOAD', 'UPLOAD_FAILED'].includes(v.persistenceState) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          resetUploadForm();
                          setDocumentToComplete(doc);
                          setDocTitle(doc.title);
                          setDocCategory(doc.category);
                          setDocPurpose(doc.purpose ?? '');
                          setIsUploadModalOpen(true);
                        }}
                      >
                        Retomar envio
                      </Button>
                    )}
                  {canUpload &&
                    !isProposalOrContract &&
                    v &&
                    ['QUARANTINED', 'UPLOAD_FAILED', 'MISSING'].includes(v.persistenceState) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={reconcileMutation.isPending}
                        onClick={() => reconcileMutation.mutate(v.id)}
                      >
                        Verificar novamente
                      </Button>
                    )}
                  {canUpload && !isProposalOrContract && doc.status !== 'ARCHIVED' && (
                    <Button
                      variant="subtle"
                      size="sm"
                      icon="delete"
                      style={{ color: 'var(--status-danger, #d32f2f)' }}
                      onClick={() => setDocumentToArchive(doc)}
                    >
                      Arquivar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Upload Document */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          resetUploadForm();
        }}
        title={
          documentToComplete
            ? 'Retomar Envio'
            : documentToReplace
              ? 'Substituir Documento'
              : 'Novo Documento no Dossiê'
        }
        subtitle="O arquivo fica disponível após a verificação de integridade e segurança."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadModalOpen(false);
                resetUploadForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={uploadMutation.isPending}
              loadingText="Enviando..."
              disabled={
                !selectedFile ||
                !docTitle.trim() ||
                uploadMutation.isPending ||
                (!frozenDocument &&
                  ((contextQuery.data?.requiresWorkOrder && !selectedWorkOrder) ||
                    (contextQuery.data?.requiresOpportunity &&
                      !opportunityId &&
                      !selectedOpportunity)))
              }
              onClick={() => uploadMutation.mutate()}
            >
              Concluir Upload
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedFile && docTitle.trim()) uploadMutation.mutate();
          }}
          style={{ display: 'grid', gap: '1rem' }}
        >
          <div>
            <label
              htmlFor={`${formId}-file`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Arquivo (PDF, PNG ou JPEG)*
            </label>
            <input
              id={`${formId}-file`}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
            {fileError && (
              <p
                style={{
                  color: 'var(--status-danger, #d32f2f)',
                  fontSize: '0.8rem',
                  marginTop: '0.25rem',
                }}
              >
                {fileError}
              </p>
            )}
            {selectedFile && !fileError && (
              <p
                style={{
                  color: 'var(--brand-primary, #087443)',
                  fontSize: '0.8rem',
                  marginTop: '0.25rem',
                }}
              >
                Selecionado: {selectedFile.name} ({formatBytes(selectedFile.size)})
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${formId}-title`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Título Identificador*
            </label>
            <input
              id={`${formId}-title`}
              type="text"
              required
              placeholder="Ex: Conta Cemig - Jan/2026"
              readOnly={!!frozenDocument}
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-category`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Categoria Documental*
            </label>
            <select
              id={`${formId}-category`}
              disabled={!!frozenDocument}
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                background: 'var(--color-surface, #fff)',
              }}
            >
              {Object.entries(CATEGORY_LABELS)
                .filter(
                  ([k]) =>
                    k !== 'ALL' &&
                    (frozenDocument
                      ? k === frozenDocument.category
                      : !!contextQuery.data?.categories.includes(k)),
                )
                .map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${formId}-purpose`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Finalidade / Observações
            </label>
            <textarea
              id={`${formId}-purpose`}
              rows={2}
              placeholder="Ex: Titularidade aprovada, conta referente à instalação da sede."
              readOnly={!!frozenDocument}
              value={docPurpose}
              onChange={(e) => setDocPurpose(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {!frozenDocument && contextQuery.data?.requiresWorkOrder && (
            <label>
              Ordem de serviço atribuída
              <select
                value={selectedWorkOrder}
                onChange={(event) => setSelectedWorkOrder(event.target.value)}
              >
                <option value="">Selecione a ordem</option>
                {contextQuery.data.workOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!frozenDocument && contextQuery.data?.requiresOpportunity && !opportunityId && (
            <label>
              Oportunidade vinculada
              <select
                value={selectedOpportunity}
                onChange={(event) => setSelectedOpportunity(event.target.value)}
              >
                <option value="">Selecione a oportunidade</option>
                {contextQuery.data.opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <input
            id={`${formId}-camera`}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            hidden
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            onClick={() => document.getElementById(`${formId}-camera`)?.click()}
          >
            Tirar foto
          </Button>
          <Feedback error={uploadMutation.error} />
        </form>
      </Modal>

      {/* Modal Add Representative */}
      <Modal
        isOpen={isRepModalOpen}
        onClose={() => setIsRepModalOpen(false)}
        title="Cadastrar Representante do Cliente"
        subtitle="Representantes legais, procuradores ou responsáveis técnicos vinculados ao cliente (SPEC-013)."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setIsRepModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={addRepMutation.isPending}
              loadingText="Salvando..."
              disabled={!repName.trim() || addRepMutation.isPending}
              onClick={() => addRepMutation.mutate()}
            >
              Salvar Representante
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (repName.trim()) addRepMutation.mutate();
          }}
          style={{ display: 'grid', gap: '1rem' }}
        >
          <div>
            <label
              htmlFor={`${formId}-representative-name`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Nome Completo*
            </label>
            <input
              id={`${formId}-representative-name`}
              type="text"
              required
              placeholder="Ex: Carlos Alberto da Silva"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-representative-document`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              CPF ou CNPJ
            </label>
            <input
              id={`${formId}-representative-document`}
              type="text"
              placeholder="000.000.000-00"
              value={repDoc}
              onChange={(e) => setRepDoc(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-representative-role`}
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Papel / Responsabilidade*
            </label>
            <select
              id={`${formId}-representative-role`}
              value={repRole}
              onChange={(e) => setRepRole(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                background: 'var(--color-surface, #fff)',
              }}
            >
              {Object.entries(REPRESENTATIVE_ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Feedback error={addRepMutation.error} />
        </form>
      </Modal>

      <Modal
        isOpen={!!historyDocument}
        onClose={() => setHistoryDocument(null)}
        title="Histórico do Documento"
        subtitle={historyDocument?.title}
      >
        {historyQuery.isPending && <p role="status">Carregando histórico...</p>}
        <Feedback error={historyQuery.error} />
        {historyQuery.data?.archiveReason && <p>Arquivado: {historyQuery.data.archiveReason}</p>}
        {historyQuery.data?.versions.map((version) => (
          <div key={version.id} style={{ marginBottom: '1rem' }}>
            <p>
              Versão {version.versionNumber} — {version.originalName} —{' '}
              {PERSISTENCE_LABELS[version.persistenceState] ?? 'Verificação pendente'}
            </p>
            <Button
              variant="secondary"
              disabled={version.persistenceState !== 'READY'}
              onClick={() =>
                window.open(
                  `/api/v1/documents/${historyDocument!.id}/versions/${version.id}/content?purpose=DOWNLOAD`,
                  '_blank',
                )
              }
            >
              Baixar versão {version.versionNumber}
            </Button>
          </div>
        ))}
        {historyQuery.data?.events.map((event, index) => (
          <p key={`${event.createdAt}-${index}`}>
            {formatDate(event.createdAt)} —{' '}
            {(
              {
                'document.upload_intended': 'Upload registrado',
                'document.replacement_intended': 'Substituição registrada',
                'document.ready': 'Documento verificado',
                'document.archived': 'Documento arquivado',
                'document.rejected': 'Arquivo rejeitado',
                'document.content_rejected': 'Conteúdo inválido',
                'document.scanner_unavailable': 'Verificação de segurança pendente',
                'document.storage_failed': 'Falha de armazenamento',
                'document.integrity_failed': 'Falha de integridade',
                'document.upload_canceled': 'Upload cancelado',
                'document.legacy_migrated': 'Arquivo legado migrado',
              } as Record<string, string>
            )[event.action] ?? 'Evento de verificação'}
          </p>
        ))}
      </Modal>

      {/* Modal Archive Document */}
      <Modal
        isOpen={!!documentToArchive}
        onClose={() => {
          setDocumentToArchive(null);
          setArchiveReason('');
        }}
        title="Arquivar Documento"
        subtitle="O documento permanece no histórico após o arquivamento."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setDocumentToArchive(null);
                setArchiveReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={archiveMutation.isPending}
              loadingText="Arquivando..."
              onClick={() => {
                if (documentToArchive) archiveMutation.mutate(documentToArchive.id);
              }}
            >
              Confirmar Arquivamento
            </Button>
          </div>
        }
      >
        <div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
            Deseja arquivar o documento <strong>{documentToArchive?.title}</strong>?
          </p>
          <label
            htmlFor={`${formId}-archive-reason`}
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.35rem',
            }}
          >
            Motivo do arquivamento (opcional):
          </label>
          <input
            id={`${formId}-archive-reason`}
            type="text"
            placeholder="Ex: Documento substituído por versão atualizada."
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--color-border, #ccc)',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
          <Feedback error={archiveMutation.error} />
        </div>
      </Modal>
    </div>
  );
}
