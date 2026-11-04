import { ChangeEvent, FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Smartphone, Wrench } from 'lucide-react';
import { publicApi } from './api';

type Assistance = { logo: string | null; name: string; phone: string | null; slug: string };
type RequestResult = { number: number; tenantName: string };
type RequestForm = {
  name: string; phone: string; email: string; brand: string; model: string; color: string;
  reportedIssue: string; accessories: string; devicePowersOn: boolean; liquidDamage: boolean;
  previousRepair: boolean; preferredContact: 'WHATSAPP' | 'PHONE' | 'EMAIL'; contactTime: string;
  privacyAccepted: boolean;
  deliveryMethod: 'DROP_OFF' | 'PICKUP'; pickupAddress: string; devicePhotos: string[];
};

const emptyForm: RequestForm = {
  name: '', phone: '', email: '', brand: '', model: '', color: '', reportedIssue: '', accessories: '',
  devicePowersOn: true, liquidDamage: false, previousRepair: false,
  preferredContact: 'WHATSAPP', contactTime: '', privacyAccepted: false,
  deliveryMethod: 'DROP_OFF', pickupAddress: '', devicePhotos: [],
};

async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('Escolha fotos JPG, PNG ou WebP de até 10 MB cada.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível abrir a foto. Escolha outra imagem.'));
      img.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.45]) {
      const photo = canvas.toDataURL('image/jpeg', quality);
      if (photo.length <= 819223) return photo;
    }
    throw new Error('A foto ficou muito grande. Escolha uma imagem menor.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PublicRepairRequest({ slug }: { slug: string }) {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const assistanceQuery = useQuery({
    queryKey: ['public-assistance', slug],
    queryFn: () => publicApi<Assistance>(`/public/repair-requests/${encodeURIComponent(slug)}`),
  });

  function update<K extends keyof RequestForm>(key: K, value: RequestForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setPhotoError('');
    if (!files.length) return;
    if (form.devicePhotos.length + files.length > 3) {
      setPhotoError('Você pode anexar até 3 fotos. Remova uma foto para escolher outra.');
      return;
    }
    setPreparingPhotos(true);
    try {
      const photos = await Promise.all(files.map(preparePhoto));
      setForm(current => ({ ...current, devicePhotos: [...current.devicePhotos, ...photos] }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Não foi possível preparar as fotos.');
    } finally {
      setPreparingPhotos(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (preparingPhotos || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const response = await publicApi<RequestResult>(`/public/repair-requests/${encodeURIComponent(slug)}`, {
        method: 'POST', body: JSON.stringify({ ...form, pickupAddress: form.deliveryMethod === 'PICKUP' ? form.pickupAddress : undefined }),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  if (assistanceQuery.isLoading) return <main className="public-page"><p className="public-loading">Carregando assistência...</p></main>;
  if (assistanceQuery.error || !assistanceQuery.data) return <main className="public-page"><section className="public-card"><h1>Link não encontrado</h1><p>Confira o endereço e tente novamente.</p></section></main>;
  const assistance = assistanceQuery.data;

  if (result) return <main className="public-page"><section className="public-card public-success">
    <div className="public-success-icon"><CheckCircle2 size={30}/></div>
    <h1>Solicitação enviada</h1>
    <p>{assistance.name} recebeu os dados do seu aparelho e vai entrar em contato.</p>
    <div className="request-protocol"><span>Número da solicitação</span><strong>OS #{String(result.number).padStart(5, '0')}</strong></div>
    <small>Este envio registra seu pedido de avaliação. O reparo, o preço e o prazo serão confirmados pela assistência após analisar o aparelho.</small>
  </section></main>;

  return <main className="public-page">
    <form className="public-card public-form" onSubmit={submit}>
      <div className="public-brand"><div className={`brand-mark ${assistance.logo ? 'has-tenant-logo' : ''}`}>{assistance.logo ? <img src={assistance.logo} alt={`Logo de ${assistance.name}`}/> : <Smartphone size={21}/>}</div><div><span>Solicitação de reparo</span><strong>{assistance.name}</strong></div></div>
      <h1>Conte o que aconteceu</h1>
      <p className="public-intro">Informe seus dados e os detalhes do aparelho. A assistência entrará em contato para confirmar o atendimento.</p>

      <fieldset><legend>Seus dados</legend>
        <div className="public-fields">
          <label>Nome completo<input autoComplete="name" maxLength={100} required value={form.name} onChange={e => update('name', e.target.value)} /></label>
          <label>Celular / WhatsApp<input autoComplete="tel" type="tel" maxLength={25} required placeholder="(11) 99999-9999" value={form.phone} onChange={e => update('phone', e.target.value)} /></label>
          <label className="field-wide">E-mail <span className="field-optional">(opcional)</span><input autoComplete="email" type="email" maxLength={160} value={form.email} onChange={e => update('email', e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset><legend>Seu aparelho</legend>
        <div className="public-fields">
          <label>Marca<input maxLength={80} required placeholder="Ex.: Apple, Samsung, Motorola" value={form.brand} onChange={e => update('brand', e.target.value)} /></label>
          <label>Modelo<input maxLength={100} required placeholder="Ex.: iPhone 13, Galaxy A54" value={form.model} onChange={e => update('model', e.target.value)} /></label>
          <label>Cor <span className="field-optional">(opcional)</span><input maxLength={50} value={form.color} onChange={e => update('color', e.target.value)} /></label>
          <label>O aparelho liga?
            <select value={String(form.devicePowersOn)} onChange={e => update('devicePowersOn', e.target.value === 'true')}><option value="true">Sim</option><option value="false">Não</option></select>
          </label>
          <label>Teve contato com líquido?
            <select value={String(form.liquidDamage)} onChange={e => update('liquidDamage', e.target.value === 'true')}><option value="false">Não</option><option value="true">Sim</option></select>
          </label>
          <label>Já passou por outro reparo?
            <select value={String(form.previousRepair)} onChange={e => update('previousRepair', e.target.value === 'true')}><option value="false">Não</option><option value="true">Sim</option></select>
          </label>
          <label className="field-wide">O que está acontecendo? Descreva o defeito<textarea required minLength={10} maxLength={2000} rows={4} placeholder="Quando começou? Acontece o tempo todo ou às vezes?" value={form.reportedIssue} onChange={e => update('reportedIssue', e.target.value)} /></label>
          <label className="field-wide">O que acompanhará o aparelho? <span className="field-optional">(opcional)</span><input maxLength={500} placeholder="Ex.: carregador, capinha, chip" value={form.accessories} onChange={e => update('accessories', e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset disabled={submitting || preparingPhotos}><legend>Fotos do aparelho <span className="field-optional">(opcional)</span></legend>
        <p className="public-help">Mostre o aparelho e os danos visíveis. Até 3 fotos JPG, PNG ou WebP, de até 10 MB cada. As imagens serão otimizadas para o envio.</p>
        <label className="public-photo-input">Anexar fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={form.devicePhotos.length >= 3} onChange={selectPhotos}/></label>
        {preparingPhotos && <p className="public-help" role="status">Preparando fotos...</p>}
        {photoError && <p className="login-error" role="alert">{photoError}</p>}
        <div className="device-photo-grid">{form.devicePhotos.map((photo, index) => <div className="device-photo" key={index}>
          <img src={photo} alt={`Foto ${index + 1} do aparelho`}/>
          <button type="button" onClick={() => setForm(current => ({ ...current, devicePhotos: current.devicePhotos.filter((_, i) => i !== index) }))} aria-label={`Remover foto ${index + 1}`}>Remover</button>
        </div>)}</div>
      </fieldset>

      <fieldset><legend>Como o aparelho chegará à assistência?</legend>
        <div className="public-delivery-options">
          <label><input type="radio" name="deliveryMethod" value="DROP_OFF" checked={form.deliveryMethod === 'DROP_OFF'} onChange={() => update('deliveryMethod', 'DROP_OFF')}/> Vou levar até a assistência</label>
          <label><input type="radio" name="deliveryMethod" value="PICKUP" checked={form.deliveryMethod === 'PICKUP'} onChange={() => update('deliveryMethod', 'PICKUP')}/> Quero que a assistência busque meu aparelho</label>
        </div>
        {form.deliveryMethod === 'PICKUP' && <div className="public-fields public-pickup-address"><label className="field-wide">Endereço completo para coleta<textarea autoComplete="street-address" required minLength={10} maxLength={500} rows={3} placeholder="Rua, número, complemento, bairro, cidade, estado e CEP. Inclua um ponto de referência, se necessário." value={form.pickupAddress} onChange={e => update('pickupAddress', e.target.value)}/></label></div>}
        {form.deliveryMethod === 'PICKUP' && <p className="public-help">A assistência entrará em contato para combinar a disponibilidade, o horário e eventuais custos da coleta.</p>}
      </fieldset>

      <fieldset><legend>Como prefere o contato?</legend>
        <div className="public-fields">
          <label>Canal preferido<select value={form.preferredContact} onChange={e => update('preferredContact', e.target.value as RequestForm['preferredContact'])}>
            <option value="WHATSAPP">WhatsApp</option><option value="PHONE">Ligação</option><option value="EMAIL" disabled={!form.email}>E-mail</option>
          </select></label>
          <label>Melhor horário <span className="field-optional">(opcional)</span><input maxLength={100} placeholder="Ex.: após as 14h" value={form.contactTime} onChange={e => update('contactTime', e.target.value)} /></label>
        </div>
      </fieldset>

      <label className="public-consent"><input type="checkbox" required checked={form.privacyAccepted} onChange={e => update('privacyAccepted', e.target.checked)} /><span>Autorizo {assistance.name} a usar estes dados para avaliar esta solicitação e entrar em contato comigo.</span></label>
      <p className="public-privacy-note"><Wrench size={14}/> Não informe senhas, PIN ou código de desbloqueio do aparelho.</p>
      {error && <div className="login-error" role="alert">{error}</div>}
      <button className="primary-btn public-submit" disabled={submitting || preparingPhotos}>{submitting ? 'Enviando...' : preparingPhotos ? 'Preparando fotos...' : 'Enviar solicitação'}</button>
    </form>
    <footer className="public-footer">Atendimento técnico com cuidado e transparência.</footer>
  </main>;
}
