'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Building, Edit, Trash2, HousePlus, Bed, Bath, Square, Upload, X, AlertCircle } from 'lucide-react'
import LoadingAnimation from '@/components/ui/LoadingAnimation'
import { Unit } from '@/types/database'
import { useAdminActions } from '@/components/admin/AdminContext'
import { useAlerts } from '@/components/ui/alerts'
import Image from 'next/image'

interface UnitFormData {
  unit_number: string
  floor: number
  bedrooms: number
  bathrooms: number
  size_sqft: number
  rent_amount: number
  status: 'vacant' | 'occupied' | 'under_maintenance'
  image_url?: string
}

interface UploadError {
  type: 'size' | 'type' | 'general'
  message: string
}

// Image cache to store signed URLs
const imageCache = new Map<string, string>()

// Helper function to get cached image URL
const getCachedImageUrl = (imagePath: string): string | null => {
  if (!imagePath) return '/placeholder-unit.svg'
  
  // Check memory cache first
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath)!
  }
  
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(`unit_image_${imagePath}`)
    if (cached) {
      const { url, expiry } = JSON.parse(cached)
      // Check if cached URL hasn't expired (cache for 50 minutes, signed URLs expire in 1 hour)
      if (Date.now() < expiry) {
        imageCache.set(imagePath, url)
        return url
      } else {
        // Remove expired cache
        localStorage.removeItem(`unit_image_${imagePath}`)
      }
    }
  } catch (error) {
    console.error('Error reading image cache:', error)
  }
  
  return null
}

// Helper function to cache image URL
const cacheImageUrl = (imagePath: string, url: string) => {
  if (!imagePath) return
  
  // Cache in memory
  imageCache.set(imagePath, url)
  
  // Cache in localStorage with expiry (50 minutes from now)
  try {
    const cacheData = {
      url,
      expiry: Date.now() + (50 * 60 * 1000) // 50 minutes
    }
    localStorage.setItem(`unit_image_${imagePath}`, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error caching image URL:', error)
  }
}

export default function UnitsManagement() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState<UnitFormData>({
    unit_number: '',
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: 500,
    rent_amount: 1000,
    status: 'vacant'
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<UploadError | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { setActions } = useAdminActions()
  const { show } = useAlerts()

  const handleAddUnit = () => {
    setEditingUnit(null)
    setFormData({
      unit_number: '',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      size_sqft: 500,
      rent_amount: 1000,
      status: 'vacant'
    })
    setImagePreview(null)
    setUploadedFile(null)
    setUploadError(null)
    setShowFormModal(true)
  }

  useEffect(() => {
    fetchUnits()
  }, [])

  useEffect(() => {
    setActions({ onAddUnit: handleAddUnit })
  }, [setActions])

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('unit_number')

      if (error) throw error
      setUnits(data || [])
    } catch (err) {
      console.error('Error fetching units:', err)
      show({ title: 'Error', description: 'Error fetching units', color: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  const getSignedImageUrl = async (imagePath: string): Promise<string> => {
    if (!imagePath) return '/placeholder-unit.svg'
    
    // Check cache first
    const cachedUrl = getCachedImageUrl(imagePath)
    if (cachedUrl) {
      return cachedUrl
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('units')
        .createSignedUrl(imagePath, 3600) // 1 hour expiry
      
      if (error) throw error
      
      // Cache the signed URL
      cacheImageUrl(imagePath, data.signedUrl)
      
      return data.signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return '/placeholder-unit.svg'
    }
  }

  const validateFile = (file: File): UploadError | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return {
        type: 'type',
        message: 'Only image files are accepted.'
      }
    }

    // Check file size (5MB limit)
    const maxBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxBytes) {
      return {
        type: 'size',
        message: `File is too big. Max file size is 5 MB.`
      }
    }

    return null
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      setUploadedFile(null)
      setImagePreview(null)
      return
    }

    // Clear any previous errors
    setUploadError(null)
    setUploadedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to storage
    try {
      setUploading(true)
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        show({ title: 'Error', description: 'Not authenticated', color: 'danger' })
        return
      }

      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('units')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) throw uploadError
      
      setFormData({ ...formData, image_url: filePath })
      
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setUploadError({
        type: 'general',
        message: err.message || 'Failed to upload image'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingUnit) {
        // Check if trying to set an occupied unit to vacant
        if (editingUnit.status === 'occupied' && formData.status === 'vacant') {
          show({ 
            title: 'Invalid Status Change', 
            description: 'Cannot set an occupied unit to vacant. Please move out the tenant first.', 
            color: 'danger' 
          })
          setSaving(false)
          setShowFormModal(false)
          setEditingUnit(null)
          return
        }

        // Update existing unit
        const { error } = await supabase
          .from('units')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUnit.id)

        if (error) throw error
        show({ title: 'Unit updated', description: 'The unit details have been updated.', color: 'success' })
      } else {
        // Create new unit
        const { error } = await supabase
          .from('units')
          .insert([formData])

        if (error) throw error
        show({ title: 'Unit added', description: 'A new unit has been created.', color: 'success' })
      }

      setShowFormModal(false)
      setEditingUnit(null)
      setImagePreview(null)
      setUploadedFile(null)
      setUploadError(null)
      fetchUnits()
    } catch (err: any) {
      console.error('Error saving unit:', err)
      show({ title: 'Error', description: err.message || 'Failed to save unit', color: 'danger' })
      setShowFormModal(false)
      setEditingUnit(null)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({
      unit_number: unit.unit_number,
      floor: unit.floor || 1,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      size_sqft: unit.size_sqft || 500,
      rent_amount: Number(unit.rent_amount),
      status: unit.status,
      image_url: unit.image_url
    })
    
    // Set image preview if unit has image
    if (unit.image_url) {
      const signedUrl = await getSignedImageUrl(unit.image_url)
      setImagePreview(signedUrl)
    } else {
      setImagePreview(null)
    }
    
    setUploadedFile(null)
    setUploadError(null)
    setShowFormModal(true)
  }

  const handleDeleteClick = (unit: Unit) => {
    setDeletingUnit(unit)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUnit) return

    try {
      // Delete image from storage if exists
      if (deletingUnit.image_url) {
        await supabase.storage
          .from('units')
          .remove([deletingUnit.image_url])
        
        // Clear cached image
        imageCache.delete(deletingUnit.image_url)
        try {
          localStorage.removeItem(`unit_image_${deletingUnit.image_url}`)
        } catch (error) {
          console.error('Error clearing image cache:', error)
        }
      }

      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', deletingUnit.id)

      if (error) throw error
      
      setShowDeleteModal(false)
      setDeletingUnit(null)
      fetchUnits()
      show({ title: 'Unit deleted', description: 'The unit has been removed.', color: 'success' })
    } catch (err: any) {
      console.error('Error deleting unit:', err)
      show({ title: 'Error', description: err.message || 'Failed to delete unit', color: 'danger' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'vacant':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'under_maintenance':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditingUnit(null)
    setImagePreview(null)
    setUploadedFile(null)
    setUploadError(null)
  }

  const removeImage = () => {
    setImagePreview(null)
    setUploadedFile(null)
    setFormData({ ...formData, image_url: undefined })
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation 
          size={150} 
          message="Loading units..." 
        />
      </div>
    )
  }

  const occupiedCount = units.filter(u => u.status === 'occupied').length
  const vacantCount = units.filter(u => u.status === 'vacant').length

  return (
    <div className="min-h-full">
      {/* Unit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Occupied Units</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Building className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-[2rem] lg:text-[2.5rem] font-semibold leading-none font-acari-sans">{occupiedCount}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Currently generating revenue</div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Vacant Units</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Building className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-[2rem] lg:text-[2.5rem] font-semibold leading-none font-acari-sans">{vacantCount}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Available for rent</div>
        </div>
      </div>

      {/* Units Grid - New Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {units.map((unit, index) => (
          <UnitCard 
            key={unit.id} 
            unit={unit} 
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            getStatusColor={getStatusColor}
            getSignedImageUrl={getSignedImageUrl}
            index={index}
          />
        ))}
      </div>

      {units.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Units Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first apartment unit.</p>
            <Button 
              onClick={handleAddUnit}
            >
              <HousePlus className="h-6 w-6 mr-3" />
              Add a Unit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Unit Modal - Redesigned */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={
          <span className="flex items-center">
            {(editingUnit ? <Edit className="h-6 w-6 mr-3 text-blue-600 mb-1" /> : <HousePlus className="h-6 w-6 mr-3 text-blue-600 mb-1" />)}
            {editingUnit ? 'Edit Unit' : 'Add New Unit'}
          </span>
        }
        description={editingUnit ? 'Update unit information' : 'Enter details for the new unit'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Unit Number
              </label>
              <Input
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                placeholder="e.g., 101, A-205"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Floor
              </label>
              <Input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Bedrooms
              </label>
              <Select
                value={formData.bedrooms}
                onChange={(value) => setFormData({ ...formData, bedrooms: parseInt(value) })}
                placeholder="Select bedrooms"
              >
                <option value={1}>1 Bedroom</option>
                <option value={2}>2 Bedrooms</option>
                <option value={3}>3 Bedrooms</option>
                <option value={4}>4 Bedrooms</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Bathrooms
              </label>
              <Select
                value={formData.bathrooms}
                onChange={(value) => setFormData({ ...formData, bathrooms: parseInt(value) })}
                placeholder="Select bathrooms"
              >
                <option value={1}>1 Bathroom</option>
                <option value={2}>2 Bathrooms</option>
                <option value={3}>3 Bathrooms</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Size (sq ft)
              </label>
              <Input
                type="number"
                value={formData.size_sqft}
                onChange={(e) => setFormData({ ...formData, size_sqft: parseInt(e.target.value) })}
                min="200"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Monthly Rent ($)
              </label>
              <Input
                type="number"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as any })}
                placeholder="Select status"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="under_maintenance">Under Maintenance</option>
              </Select>
            </div>

            {/* Compact Image Upload Section */}
            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-medium leading-none">Unit Image</label>
              
              {/* File Upload Area */}
              <div className="space-y-3">
                {/* Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Choose file'}
                  </Button>
                </div>

                {/* File Preview or Error */}
                {uploadedFile && !uploadError && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Upload className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Current Image Preview (for editing) */}
                {imagePreview && !uploadedFile && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 relative rounded-lg overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Current unit image"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Current Image
                        </p>
                        <p className="text-xs text-gray-500">
                          Click "Choose file" to replace
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Error Display */}
                {uploadError && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          {uploadError.type === 'size' ? 'Trust Jamin.png' : 'hello-world.pdf'}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {uploadError.message}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={closeModal}
              disabled={saving || uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? 'Saving...' : (editingUnit ? 'Update Unit' : 'Add Unit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Unit"
        message={`Are you sure you want to delete unit ${deletingUnit?.unit_number}? This action cannot be undone.`}
        confirmText="Delete Unit"
        confirmVariant="destructive"
      />

      <div className="h-8"></div>
    </div>
  )
}

// New UnitCard component with fixed height and cached images
function UnitCard({ 
  unit, 
  onEdit, 
  onDelete, 
  getStatusColor, 
  getSignedImageUrl,
  index = 0
}: { 
  unit: Unit
  onEdit: (unit: Unit) => void
  onDelete: (unit: Unit) => void
  getStatusColor: (status: string) => string
  getSignedImageUrl: (path: string) => Promise<string>
  index?: number
}) {
  const [imageUrl, setImageUrl] = useState<string>('/placeholder-unit.svg')
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      if (unit.image_url && !imageLoaded) {
        const url = await getSignedImageUrl(unit.image_url)
        setImageUrl(url)
        setImageLoaded(true)
      }
    }
    
    loadImage()
  }, [unit.image_url, getSignedImageUrl, imageLoaded])

  return (
    <div className="relative group">
      <Card className="h-[480px] hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Image Section */}
        <div className="relative h-60 bg-gray-200 dark:bg-gray-800">
          <Image
            src={imageUrl}
            alt={`Unit ${unit.unit_number}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={index < 2}
            className="object-cover"
            onError={() => setImageUrl('/placeholder-unit.svg')}
          />
          {/* Status badge positioned on image */}
          <div className="absolute top-3 left-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
              {unit.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-3 mb-4">
            {/* Rent Amount - Primary text */}
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${Number(unit.rent_amount).toLocaleString()}/month
            </div>
            
            {/* Unit Number - Secondary text */}
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Unit {unit.unit_number}
            </div>
            
            {/* Floor - Subtle text */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Floor {unit.floor}
            </div>

            {/* Bed, Bath, Size with icons in pill containers */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                <Bed className="h-3 w-3" />
                <span>{unit.bedrooms} Bed{unit.bedrooms !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                <Bath className="h-3 w-3" />
                <span>{unit.bathrooms} Bath{unit.bathrooms !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                <Square className="h-3 w-3" />
                <span>{unit.size_sqft} sq ft</span>
              </div>
            </div>

            {/* Separator line - moved below pills */}
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Edit/Delete buttons - moved inside card at bottom-right */}
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(unit)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(unit)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}