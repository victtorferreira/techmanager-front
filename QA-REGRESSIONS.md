# Regressões TM-QA-001 a TM-QA-004

| ID | Causa verificada no código | Correção |
| --- | --- | --- |
| TM-QA-001 | Os formulários dependiam das mensagens nativas, que seguem o idioma do navegador. | Validação compartilhada em português, identificando o campo e limpando o erro quando ele é editado. Mantém as regras nativas de obrigatoriedade, formato, tamanho e limites. |
| TM-QA-002 | O botão Nova ordem não tinha uma ação. Também faltava uma interface para registrar o aparelho do atendimento. | Diálogo com cliente, aparelho existente ou novo, defeito e previsão de entrega. Aparelho e OS são salvos na mesma transação. Sem clientes, o formulário explica o requisito e oferece o link do cadastro. |
| TM-QA-003 | O botão Buscar do cabeçalho não tinha uma ação. | Busca global em clientes, ordens, produtos e fornecedores, com carregamento, estado vazio, erro e links para os resultados. As consultas recebem o tenant autenticado. |
| TM-QA-004 | Os controles datetime-local eram controlados pelo estado React; o envio lia esse estado, sem validar o intervalo no formulário. O backend já rejeitava intervalos inválidos e não aplicava uma duração padrão. | Os controles nativos preservam suas edições e o envio lê os valores visíveis por FormData, valida início/término e envia ambos sem substituição. A agenda seleciona a data efetivamente salva. |

## Executar

```powershell
# Frontend: requer Chrome instalado; usa o navegador em inglês e fuso America/Sao_Paulo.
npm.cmd install
npm.cmd run test:e2e
npm.cmd run build

# Backend, no diretório backend:
npm.cmd run build
node --test test/*.test.cjs
```

Os testes de navegador usam o frontend real com respostas da API simuladas e dados fictícios. Não dependem de PostgreSQL nem alteram dados reais. Os testes do backend validam serviços e DTOs com persistência simulada. A validação no ambiente publicado deve usar as versões atualizadas de frontend e backend.

Os cenários cobrem mensagens obrigatórias e e-mail inválido em Chrome em inglês; abertura da OS sem clientes; criação com aparelho novo e existente; erro ao salvar; busca e navegação; estados vazio/erro e fechamento pelo teclado; término às 09:15, 09:30 ou 10:00 para início às 10:00; preservação de 11:15 no payload e no cartão; e leitura de alterações no controle nativo mesmo sem um evento de mudança React.

As alterações desta correção não exigem migration de banco.
