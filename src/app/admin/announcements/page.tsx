'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Bell, Edit, Trash2, Plus, Calendar, Megaphone } from 'lucide-react'
import { useAdminActions } from '@/components/admin/AdminContext'
import LoadingAnimation from '@/components/ui/LoadingAnimation'
import { useAlerts } from '@/components/ui/alerts'

interface Announcement {
  id: number
  title: string
  content: string
  author_id: string | null
  created_at: string
  users?: {
    full_name: string
  }
}

interface AnnouncementFormData {
  title: string
  content: string
}

export default function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: ''
  })
  const [error, setError] = useState('')
  const supabase = createClient()
  const { setActions } = useAdminActions()
  const { show } = useAlerts()

  const handleAddAnnouncement = () => {
    setEditingAnnouncement(null)
    setFormData({
      title: '',
      content: ''
    })
    setShowFormModal(true)
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  useEffect(() => {
    setActions({ onAddAnnouncement: handleAddAnnouncement })
  }, [setActions])

  const fetchAnnouncements = async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true)
      }
      
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          users (full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setError('Error fetching announcements')
    } finally {
      if (!skipLoadingState) {
        setLoading(false)
      }
    }
  }

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('You must be logged in to create announcements')
      }

      const announcementData = {
        title: formData.title,
        content: formData.content,
        author_id: currentUser.id
      }

      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id)

        if (error) throw error
        show({ title: 'Announcement updated', description: 'The announcement has been updated.', color: 'success' })
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('announcements')
          .insert([announcementData])

        if (error) throw error
        show({ title: 'Announcement created', description: 'A new announcement has been posted.', color: 'success' })
      }

      setShowFormModal(false)
      setEditingAnnouncement(null)
      await fetchAnnouncements(true)
    } catch (err: any) {
      console.error('Error saving announcement:', err)
      setError(err.message || 'Error saving announcement')
      show({ title: 'Error', description: err.message || 'Failed to save announcement', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content
    })
    setShowFormModal(true)
  }

  const handleDeleteClick = (announcement: Announcement) => {
    setDeletingAnnouncement(announcement)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', deletingAnnouncement.id)

      if (error) throw error
      
      // Immediately update the local state to remove the deleted announcement
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== deletingAnnouncement.id))
      
      setShowDeleteModal(false)
      setDeletingAnnouncement(null)
      
      // Also refresh from database to ensure consistency
      await fetchAnnouncements(true)
      
      show({ title: 'Announcement deleted', description: 'The announcement has been removed.', color: 'success' })
    } catch (err: any) {
      console.error('Error deleting announcement:', err)
      setError(err.message || 'Error deleting announcement')
      show({ title: 'Error', description: err.message || 'Failed to delete announcement', color: 'danger' })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditingAnnouncement(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation 
          size={150} 
          message="Loading announcements..." 
        />
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-6">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-3 flex items-center">
                    <Megaphone className="h-6 w-6 mr-3 text-blue-600" />
                    {announcement.title}
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(announcement.created_at)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(announcement)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(announcement)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{announcement.content}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Announcements Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create announcements to communicate with all tenants.</p>
            <Button 
              onClick={handleAddAnnouncement}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Announcement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Announcement Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={
          <span className="flex items-center">
            {(editingAnnouncement ? <Edit className="h-6 w-6 mr-3 text-blue-600 mb-1" /> : <Megaphone className="h-6 w-6 mr-3 text-blue-600 mb-1" />)}
            {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
          </span>
        }
        description={editingAnnouncement ? 'Update announcement details' : 'Create an announcement for all tenants'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Title
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter announcement title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Content
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter announcement content..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
            >
              {saving ? 'Saving...' : (editingAnnouncement ? 'Update Announcement' : 'Create Announcement')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete Announcement"
        confirmVariant="destructive"
      />

      <div className="h-8"></div>
    </div>
  )
} 