let isDeletePinModalOpen = false;
const listeners = new Set();

export function subscribeToDeletePinModal(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeletePinModalState() {
  return isDeletePinModalOpen;
}

export function setDeletePinModalState(isOpen) {
  if (isDeletePinModalOpen === isOpen) return;
  isDeletePinModalOpen = isOpen;
  listeners.forEach((listener) => listener());
}
