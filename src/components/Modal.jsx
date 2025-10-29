const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header" role="banner">
            <h3 className="modal-title">{title}</h3>
            {/* Botón de cierre explícito para accesibilidad y usabilidad */}
            {onClose && (
              <button
                type="button"
                aria-label="Cerrar"
                className="modal-close-button"
                onClick={onClose}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
