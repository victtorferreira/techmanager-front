import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from './api';
import Modal from './components/Modal';

type Result = { id: string; kind: string; title: string; description: string; href: string };
function SearchDialog({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setTerm(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const query = useQuery({ queryKey: ['global-search', term], queryFn: () => api<{ items: Result[] }>(`/search?q=${encodeURIComponent(term)}`), enabled: term.length >= 2, retry: false });
  const pending = search.trim() !== term || query.isFetching;
  return <Modal title="Busca global" onClose={onClose} className="global-search-modal">
    <label className="global-search-input"><Search size={18}/><input autoFocus type="search" aria-label="Buscar clientes, ordens, produtos ou fornecedores" placeholder="Cliente, OS, produto ou fornecedor" maxLength={120} value={search} onChange={event => setSearch(event.target.value)}/></label>
    <div className="global-search-results" aria-live="polite" aria-busy={pending}>
      {search.trim().length < 2 ? <p className="feedback">Digite pelo menos 2 caracteres para buscar.</p> : pending ? <p className="feedback">Buscando...</p> : query.error ? <div role="alert" className="feedback error">Não foi possível realizar a busca. <button className="secondary-btn" onClick={() => void query.refetch()}>Tentar novamente</button></div> : query.data?.items.length ? <><p className="global-search-hint">Até 8 resultados por categoria.</p><ul>{query.data.items.map(result => <li key={`${result.kind}-${result.id}`}><Link to={result.href} onClick={onClose}><span className="global-search-kind">{result.kind}</span><strong>{result.title}</strong><small>{result.description}</small></Link></li>)}</ul></> : <p className="feedback">Nenhum resultado encontrado.</p>}
    </div>
  </Modal>;
}
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  return <><button className="icon-btn" aria-label="Buscar" title="Buscar" aria-haspopup="dialog" onClick={() => setOpen(true)}><Search size={18}/></button>{open && <SearchDialog onClose={() => setOpen(false)}/>}</>;
}
