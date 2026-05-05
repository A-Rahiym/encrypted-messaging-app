export function bindLogoutModal(onConfirm) {
  const modal = document.getElementById('logout-modal');
  const openButton = document.getElementById('logout-btn');
  const cancelButton = document.getElementById('logout-cancel');
  const confirmButton = document.getElementById('logout-confirm');
  const backdrop = modal.querySelector('[data-modal-close]');

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    cancelButton.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  openButton.addEventListener('click', openModal);
  cancelButton.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  confirmButton.addEventListener('click', async () => {
    closeModal();
    await onConfirm();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}