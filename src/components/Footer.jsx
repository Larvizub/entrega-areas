const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-left">
            <p className="footer-text">
              © {currentYear} Grupo Heroica
            </p>
          </div>
          <div className="footer-right">
            <p className="footer-text text-muted">
              App de Entregas de Áreas
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
