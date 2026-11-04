import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Building2, Save, Upload, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setTenantName } from '../api';

type TenantProfile = { id: string; name: string; slug: string; logo: string | null };

export default function SettingsPage({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['tenant-profile'], queryFn: () => api<TenantProfile>('/tenant/profile') });
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState('');
  const [readingLogo, setReadingLogo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile.data) { setName(profile.data.name); setLogo(profile.data.logo ?? null); }
  }, [profile.data]);

  const updateProfile = useMutation({
    mutationFn: () => api<TenantProfile>('/tenant/profile', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), logo }) }),
    onSuccess: async updated => {
      setTenantName(updated.name);
      queryClient.setQueryData(['tenant-profile'], updated);
      setSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
    },
    onError: () => setSuccess(false),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || readingLogo || updateProfile.isPending) return;
    setSuccess(false); updateProfile.mutate();
  }

  async function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSuccess(false); setLogoError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) {
      setLogoError('Selecione uma imagem PNG, JPG ou WebP de até 256 KB.'); return;
    }
    setReadingLogo(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Falha na leitura'));
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(); image.onerror = reject; image.src = data;
      });
      setLogo(data);
    } catch { setLogoError('Não foi possível abrir a imagem. Selecione outro arquivo.'); }
    finally { setReadingLogo(false); }
  }

  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Configurações</h2><p>Personalize os dados que identificam sua assistência no sistema.</p></div></div>
    <form className="panel tenant-settings" onSubmit={submit}>
      <div className="tenant-settings-heading"><span className="tenant-settings-icon"><Building2 size={20}/></span><div><h3>Identidade da assistência</h3><p>O nome e a logo aparecem na barra lateral e no formulário público de solicitação.</p></div></div>
      {profile.isLoading ? <p className="feedback">Carregando dados da assistência...</p> : profile.error ? <p className="feedback error">Não foi possível carregar os dados da assistência.</p> : <>
        <label>Nome da assistência<input required minLength={2} maxLength={80} value={name} disabled={!canEdit || updateProfile.isPending} onChange={event => { setName(event.target.value); setSuccess(false); }} placeholder="Ex.: Assistência do Victor" /></label>
        <small className="tenant-settings-hint">De 2 a 80 caracteres. O link público da assistência não será alterado.</small>
        <div className="tenant-logo-field">
          <span className="tenant-logo-label">Logo da assistência</span>
          <div className="tenant-logo-editor">
            <div className="tenant-logo-preview">{logo ? <img src={logo} alt="Prévia da logo da assistência"/> : <Building2 size={32}/>}</div>
            <div className="tenant-logo-controls">
              {canEdit && <><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Selecionar logo da assistência" disabled={updateProfile.isPending || readingLogo} onChange={selectLogo}/>
                <button type="button" className="secondary-btn" disabled={updateProfile.isPending || readingLogo} onClick={() => fileInput.current?.click()}><Upload size={15}/>{readingLogo ? 'Carregando...' : logo ? 'Trocar logo' : 'Enviar logo'}</button>
                {logo && <button type="button" className="secondary-btn" disabled={updateProfile.isPending || readingLogo} onClick={() => { setLogo(null); setLogoError(''); setSuccess(false); }}><Trash2 size={15}/>Remover logo</button>}</>}
              <small className="tenant-settings-hint">PNG, JPG ou WebP de até 256 KB. Prefira uma imagem quadrada.</small>
            </div>
          </div>
          {logoError && <p className="feedback error" role="alert">{logoError}</p>}
        </div>
        {!canEdit && <p className="tenant-settings-readonly">Somente proprietários e administradores podem alterar o nome e a logo.</p>}
        {updateProfile.error && <p className="feedback error">{updateProfile.error.message}</p>}
        {success && <p className="tenant-settings-success" role="status">Dados da assistência atualizados.</p>}
        {canEdit && <div className="form-modal-actions"><button type="submit" className="primary-btn" disabled={updateProfile.isPending || readingLogo || name.trim().length < 2 || (name.trim() === profile.data?.name && logo === (profile.data?.logo ?? null))}><Save size={16}/>{updateProfile.isPending ? 'Salvando...' : 'Salvar alterações'}</button></div>}
      </>}
    </form>
  </div>;
}
