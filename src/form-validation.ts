type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
function isField(target: EventTarget | null): target is Field {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}
function fieldLabel(field: Field) {
  const label = field.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
  label?.querySelectorAll('input, select, textarea, button, .field-optional').forEach(control => control.remove());
  return (field.getAttribute('aria-label') || label?.textContent || 'este campo').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}
export function installPortugueseValidation() {
  function invalid(event: Event) {
    if (!isField(event.target)) return;
    const field = event.target;
    // Preserve specific application errors, such as a mismatched password.
    if (field.validity.customError) return;
    const label = fieldLabel(field);
    const validity = field.validity;
    let message = `Verifique o valor de ${label}.`;
    if (validity.valueMissing) message = `Preencha o campo ${label}.`;
    else if (validity.typeMismatch) message = field instanceof HTMLInputElement && field.type === 'email' ? `Informe um e-mail válido em ${label}.` : `Informe um valor válido em ${label}.`;
    else if (validity.badInput) message = `Informe um valor válido em ${label}.`;
    else if (validity.tooShort) message = `Use pelo menos ${(field as HTMLInputElement).minLength} caracteres em ${label}.`;
    else if (validity.tooLong) message = `Use no máximo ${(field as HTMLInputElement).maxLength} caracteres em ${label}.`;
    else if (validity.rangeUnderflow) message = `O valor de ${label} deve ser igual ou maior que ${(field as HTMLInputElement).min}.`;
    else if (validity.rangeOverflow) message = `O valor de ${label} deve ser igual ou menor que ${(field as HTMLInputElement).max}.`;
    else if (validity.stepMismatch) message = `Informe um valor válido em ${label}, respeitando o intervalo de ${(field as HTMLInputElement).step}.`;
    else if (validity.patternMismatch) message = `Preencha ${label} no formato solicitado.`;
    field.setCustomValidity(message);
  }
  function clear(event: Event) { if (isField(event.target)) event.target.setCustomValidity(''); }
  document.addEventListener('invalid', invalid, true);
  document.addEventListener('input', clear, true);
  document.addEventListener('change', clear, true);
  document.addEventListener('reset', event => {
    if (event.target instanceof HTMLFormElement) Array.from(event.target.elements).forEach(element => { if (isField(element)) element.setCustomValidity(''); });
  }, true);
}
