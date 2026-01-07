import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export const api = {
  async getProjects(filters = {}) {
    let query = supabase.from('projects').select('id, name, description, created_at, updated_at, created_by').order('updated_at', { ascending: false })
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    const { data: projects, error } = await query
    if (error) return { success: false, error: error.message }
    for (const project of projects || []) {
      const { data: tags } = await supabase.from('tags').select('key, value').eq('project_id', project.id)
      project.tags = (tags || []).reduce((acc, t) => { acc[t.key] = t.value; return acc }, {})
    }
    let filtered = projects || []
    if (filters.tag_key) {
      filtered = filtered.filter(p => filters.tag_value ? p.tags[filters.tag_key]?.toLowerCase().includes(filters.tag_value.toLowerCase()) : p.tags[filters.tag_key] !== undefined)
    }
    return { success: true, projects: filtered }
  },

  async getProject(id) {
    const { data: project, error } = await supabase.from('projects').select('*').eq('id', id).single()
    if (error) return { success: false, error: error.message }
    const { data: tags } = await supabase.from('tags').select('key, value').eq('project_id', id)
    return { success: true, project: { ...project, tags: (tags || []).reduce((acc, t) => { acc[t.key] = t.value; return acc }, {}) } }
  },

  async createProject({ name, description, created_by, data, tags }) {
    const { data: project, error } = await supabase.from('projects').insert({ name, description: description || '', created_by: created_by || 'Unknown', data: data || {} }).select().single()
    if (error) return { success: false, error: error.message }
    if (tags && typeof tags === 'object') {
      const tagRows = Object.entries(tags).filter(([_, v]) => v).map(([key, value]) => ({ project_id: project.id, key, value }))
      if (tagRows.length > 0) await supabase.from('tags').insert(tagRows)
    }
    return { success: true, project: { ...project, tags: tags || {} } }
  },

  async updateProject(id, { name, description, data, tags }) {
    const updates = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (data !== undefined) updates.data = data
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }
    if (tags !== undefined) {
      await supabase.from('tags').delete().eq('project_id', id)
      const tagRows = Object.entries(tags).filter(([_, v]) => v).map(([key, value]) => ({ project_id: id, key, value }))
      if (tagRows.length > 0) await supabase.from('tags').insert(tagRows)
    }
    return { success: true, updated_at: updates.updated_at }
  },

  async copyProject(id, newName) {
    const { data: original, error: fetchError } = await supabase.from('projects').select('*').eq('id', id).single()
    if (fetchError) return { success: false, error: 'Project not found' }
    const { data: newProject, error: insertError } = await supabase.from('projects').insert({ name: newName || `${original.name} (Copy)`, description: original.description, created_by: original.created_by, data: original.data }).select().single()
    if (insertError) return { success: false, error: insertError.message }
    const { data: tags } = await supabase.from('tags').select('key, value').eq('project_id', id)
    if (tags?.length > 0) await supabase.from('tags').insert(tags.map(t => ({ project_id: newProject.id, key: t.key, value: t.value })))
    return { success: true, project: { ...newProject, tags: (tags || []).reduce((acc, t) => { acc[t.key] = t.value; return acc }, {}) } }
  },

  async deleteProject(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    return error ? { success: false, error: error.message } : { success: true }
  },

  async getTagKeys() {
    const { data, error } = await supabase.from('tags').select('key')
    if (error) return { success: false, keys: [] }
    return { success: true, keys: [...new Set(data.map(t => t.key))].sort() }
  }
}
