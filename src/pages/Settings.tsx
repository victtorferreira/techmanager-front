import { FormEvent, useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setTenantName } from '../api';

type TenantProfile = { id: string; name: string; slug: string };

export default function SettingsPage({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['tenant-profile'], queryFn: () => api<TenantProfile>('/tenant/profile') });
  const [name, setName] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile.data) setName(profile.data.name);
  }, [profile.data]);

  const updateProfile = useMutation({
    mutationFn: () => api<TenantProfile>('/tenant/profile', { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: async updated => {
      setTenantName(updated.name);
      queryClient.setQueryData(['tenant-profile'], updated);
      setSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
    },
    onError: () => setSuccess(false),
  });

  function submit(event: FormEvent) {
    event.preventDefault(); setSuccess(false); updateProfile.mutate();
  }

  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Configurações</h2><p>Personalize os dados que identificam sua assistência no sistema.</p></div></div>
    <form className="panel tenant-settings" onSubmit={submit}>
      <div className="tenant-settings-heading"><span className="tenant-settings-icon"><Building2 size={20}/></span><div><h3>Identidade da assistência</h3><p>O nome aparece na barra lateral e no formulário público de solicitação.</p></div></div>
      {profile.isLoading ? <p className="feedback">Carregando dados da assistência...</p> : profile.error ? <p className="feedback error">Não foi possível carregar os dados da assistência.</p> : <>
        <label>Nome da assistência<input required minLength={2} maxLength={80} value={name} disabled={!canEdit || updateProfile.isPending} onChange={event => { setName(event.target.value); setSuccess(false); }} placeholder="Ex.: Assistência do Victor" /></label>
        <small className="tenant-settings-hint">De 2 a 80 caracteres. O link público da assistência não será alterado.</small>
        {!canEdit && <p className="tenant-settings-readonly">Somente proprietários e administradores podem alterar este nome.</p>}
        {updateProfile.error && <p className="feedback error">{updateProfile.error.message}</p>}
        {success && <p className="tenant-settings-success">Nome da assistência atualizado.</p>}
        {canEdit && <div className="form-modal-actions"><button type="submit" className="primary-btn" disabled={updateProfile.isPending || name.trim().length < 2 || name.trim() === profile.data?.name}><Save size={16}/>{updateProfile.isPending ? 'Salvando...' : 'Salvar alterações'}</button></div>}
      </>}
    </form>
  </div>;
}
