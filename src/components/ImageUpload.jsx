import { useState } from 'preact/hooks'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../config/firebase'

const ImageUpload = ({ onImageUploaded, currentImageUrls }) => {
  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState(Array.isArray(currentImageUrls) ? currentImageUrls : (currentImageUrls ? [currentImageUrls] : []))

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Mostrar vistas previas
    const newPreviewUrls = []
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        newPreviewUrls.push(event.target.result)
        if (newPreviewUrls.length === files.length) {
          setPreviewUrls(prev => [...prev, ...newPreviewUrls])
        }
      }
      reader.readAsDataURL(file)
    })

    // Subir a Firebase Storage
    setUploading(true)
    const uploadedImages = []
    try {
      for (const file of files) {
        const imageId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
        const storageRef = ref(storage, `damage-images/${imageId}`)
        
        await uploadBytes(storageRef, file)
        const downloadURL = await getDownloadURL(storageRef)
        
        uploadedImages.push({ imageUrl: downloadURL, imageId })
      }
      
      onImageUploaded(uploadedImages)
    } catch (error) {
      console.error('Error al subir las imágenes:', error)
      alert('Error al subir las imágenes. Intente nuevamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="image-upload">
      <label className="form-label">Adjuntar imágenes del daño:</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="form-input"
        disabled={uploading}
      />
      {uploading && (
        <div className="text-center mt-sm">
          <i className="fas fa-spinner fa-spin"></i> Subiendo imágenes...
        </div>
      )}
      {previewUrls.length > 0 && (
        <div className="text-center">
          {previewUrls.map((url, index) => (
            <img key={index} src={url} alt={`Vista previa ${index + 1}`} className="image-preview" style={{ margin: '5px', maxWidth: '100px', maxHeight: '100px' }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
