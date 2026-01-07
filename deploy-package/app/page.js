'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../lib/supabase'

// ==================== PROJECT LIST SIDEBAR ====================
function ProjectList({ onSelect, onNew, currentId, refreshRef }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState({ key: '', value: '' })
  const [tagKeys, setTagKeys] = useState([])

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const filters = {}
    if (search) filters.search = search
    if (tagFilter.key) filters.tag_key = tagFilter.key
    if (tagFilter.value) filters.tag_value = tagFilter.value
    const result = await api.getProjects(filters)
    if (result.success) setProjects(result.projects)
    setLoading(false)
  }, [search, tagFilter])

  useEffect(() => {
    loadProjects()
    api.getTagKeys().then(r => r.success && setTagKeys(r.keys))
  }, [])

  useEffect(() => {
    const t = setTimeout(loadProjects, 300)
    return () => clearTimeout(t)
  }, [search, tagFilter, loadProjects])

  useEffect(() => {
    if (refreshRef) refreshRef.current = loadProjects
  }, [refreshRef, loadProjects])

  const handleCopy = async (e, p) => {
    e.stopPropagation()
    const name = prompt('Name for copy:', `${p.name} (Copy)`)
    if (name) {
      const r = await api.copyProject(p.id, name)
      if (r.success) { loadProjects(); onSelect(r.project.id) }
    }
  }

  const handleDelete = async (e, p) => {
    e.stopPropagation()
    if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) {
      await api.deleteProject(p.id)
      loadProjects()
      if (currentId === p.id) onSelect(null)
    }
  }

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800">📁 Projects</h2>
          <button onClick={onNew} className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700">+ New</button>
        </div>
        <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mb-2" />
        <div className="flex gap-2">
          <select value={tagFilter.key} onChange={e => setTagFilter({...tagFilter, key: e.target.value, value: ''})} className="flex-1 border rounded px-2 py-1 text-sm">
            <option value="">All tags</option>
            {tagKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          {tagFilter.key && (
            <input placeholder="Filter value..." value={tagFilter.value} onChange={e => setTagFilter({...tagFilter, value: e.target.value})} className="flex-1 border rounded px-2 py-1 text-sm" />
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">📋</div>
            No projects yet. Create one!
          </div>
        ) : (
          projects.map(p => (
            <div key={p.id} onClick={() => onSelect(p.id)} className={`p-3 rounded-lg mb-2 cursor-pointer border transition-all ${currentId === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
              <div className="flex justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-slate-800">{p.name}</div>
                  {p.description && <div className="text-xs text-slate-500 truncate mt-0.5">{p.description}</div>}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(p.tags || {}).map(([k,v]) => (
                      <span key={k} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{k}: {v}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button onClick={e => handleCopy(e, p)} className="text-slate-400 hover:text-blue-600 text-sm p-1" title="Duplicate">📋</button>
                  <button onClick={e => handleDelete(e, p)} className="text-slate-400 hover:text-red-600 text-sm p-1" title="Delete">🗑️</button>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2">Updated: {new Date(p.updated_at).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ==================== NEW PROJECT MODAL ====================
function NewProjectModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [tags, setTags] = useState({})
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const suggested = ['Customer', 'Project Manager', 'Department', 'Status', 'Year']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-4">🆕 New Project</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Redesign" className="w-full border rounded px-3 py-2" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief project description..." className="w-full border rounded px-3 py-2 h-20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Created By</label>
            <input value={createdBy} onChange={e => setCreatedBy(e.target.value)} placeholder="Your name" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
              {Object.entries(tags).map(([k,v]) => (
                <span key={k} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1">
                  {k}: {v}
                  <button onClick={() => { const t = {...tags}; delete t[k]; setTags(t) }} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={newKey} onChange={e => setNewKey(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">Select tag...</option>
                {suggested.filter(s => !tags[s]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" className="flex-1 border rounded px-2 py-1.5 text-sm" onKeyDown={e => { if (e.key === 'Enter' && newKey && newVal) { setTags({...tags, [newKey]: newVal}); setNewKey(''); setNewVal('') }}} />
              <button onClick={() => { if(newKey && newVal) { setTags({...tags, [newKey]: newVal}); setNewKey(''); setNewVal('') }}} className="px-3 py-1.5 bg-slate-200 rounded text-sm hover:bg-slate-300">Add</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-slate-50">Cancel</button>
          <button onClick={() => name && onSave({ name, description, created_by: createdBy, tags })} disabled={!name} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">Create Project</button>
        </div>
      </div>
    </div>
  )
}

// ==================== EDIT PROJECT MODAL ====================
function EditProjectModal({ project, tags, onSave, onClose }) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [editedTags, setEditedTags] = useState(tags || {})
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const suggested = ['Customer', 'Project Manager', 'Department', 'Status', 'Year']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-4">✏️ Edit Project Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 h-20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
              {Object.entries(editedTags).map(([k,v]) => (
                <span key={k} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1">
                  {k}: {v}
                  <button onClick={() => { const t = {...editedTags}; delete t[k]; setEditedTags(t) }} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={newKey} onChange={e => setNewKey(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">Select tag...</option>
                {suggested.filter(s => !editedTags[s]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" className="flex-1 border rounded px-2 py-1.5 text-sm" />
              <button onClick={() => { if(newKey && newVal) { setEditedTags({...editedTags, [newKey]: newVal}); setNewKey(''); setNewVal('') }}} className="px-3 py-1.5 bg-slate-200 rounded text-sm hover:bg-slate-300">Add</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave({ name, description, tags: editedTags })} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ==================== GANTT PLANNER COMPONENT ====================
function GanttPlanner({ 
  categories, setCategories,
  tasks, setTasks,
  dependencies, setDependencies,
  assignees, setAssignees,
  startDate, setStartDate,
  numWeeks, setNumWeeks
}) {
  const [dragState, setDragState] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [creatingDependency, setCreatingDependency] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [taskForm, setTaskForm] = useState({ name: '', categoryId: '', startDay: 0, durationDays: 5, assignee: '', isMilestone: false })
  const [gridDimensions, setGridDimensions] = useState({ width: 0, left: 0 })
  const [showAssigneeModal, setShowAssigneeModal] = useState(false)
  const [newAssigneeName, setNewAssigneeName] = useState('')
  const [newAssigneeColor, setNewAssigneeColor] = useState('#3b82f6')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportData, setExportData] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [draggedCategory, setDraggedCategory] = useState(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  const gridContainerRef = useRef(null)

  const DAYS_PER_WEEK = 5
  const totalDays = numWeeks * DAYS_PER_WEEK
  const ROW_HEIGHT = 85
  const CATEGORY_WIDTH = 140
  const DRAG_HANDLE_WIDTH = 24

  useEffect(() => {
    const updateDimensions = () => {
      if (gridContainerRef.current) {
        const rect = gridContainerRef.current.getBoundingClientRect()
        setGridDimensions({ width: rect.width, left: rect.left })
      }
    }
    const timeoutId = setTimeout(updateDimensions, 50)
    window.addEventListener('resize', updateDimensions)
    return () => { window.removeEventListener('resize', updateDimensions); clearTimeout(timeoutId) }
  }, [categories, numWeeks])

  const getWeekDates = () => {
    const weeks = []
    for (let i = 0; i < numWeeks; i++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(weekStart.getDate() + i * 7)
      weeks.push(weekStart)
    }
    return weeks
  }
  const weeks = getWeekDates()

  const formatWeekHeader = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${day}/${month}`
  }

  const getTaskStyle = (task) => {
    const dayWidth = 100 / totalDays
    return { left: `${task.startDay * dayWidth}%`, width: `calc(${task.durationDays * dayWidth}% - 8px)` }
  }

  const getClientX = (e) => e.touches?.[0]?.clientX ?? e.clientX

  const getMinStartDay = (taskId) => {
    let minStart = 0
    for (const dep of dependencies) {
      if (dep.toTaskId === taskId) {
        const fromTask = tasks.find(t => t.id === dep.fromTaskId)
        if (fromTask && fromTask.startDay !== null) {
          minStart = Math.max(minStart, fromTask.startDay + fromTask.durationDays)
        }
      }
    }
    return minStart
  }

  const cascadeDependencies = (updatedTasks, movedTaskId) => {
    let tasksMap = new Map(updatedTasks.map(t => [t.id, { ...t }]))
    let changed = true, iterations = 0
    while (changed && iterations < 100) {
      changed = false
      iterations++
      for (const dep of dependencies) {
        const fromTask = tasksMap.get(dep.fromTaskId)
        const toTask = tasksMap.get(dep.toTaskId)
        if (fromTask && toTask && fromTask.startDay !== null && toTask.startDay !== null) {
          const fromEndDay = fromTask.startDay + fromTask.durationDays
          if (toTask.startDay < fromEndDay) {
            tasksMap.set(toTask.id, { ...toTask, startDay: fromEndDay })
            changed = true
          }
        }
      }
    }
    return Array.from(tasksMap.values())
  }

  const handleDragStart = (e, task, mode = 'move') => {
    e.stopPropagation()
    if (e.type === 'touchstart') e.preventDefault()
    setDragState({ taskId: task.id, mode, startX: getClientX(e), originalStartDay: task.startDay, originalDurationDays: task.durationDays })
    setSelectedTask(null)
    setCreatingDependency(null)
  }

  const handleDragMove = useCallback((e) => {
    if (!dragState || gridDimensions.width === 0) return
    const clientX = getClientX(e)
    const dayWidth = gridDimensions.width / totalDays
    const deltaX = clientX - dragState.startX
    const dayDelta = Math.round(deltaX / dayWidth)

    setTasks(prev => {
      let updatedTasks = prev.map(task => {
        if (task.id !== dragState.taskId) return task
        if (dragState.mode === 'move') {
          const minStart = getMinStartDay(task.id)
          const newStartDay = Math.max(minStart, Math.min(totalDays - dragState.originalDurationDays, dragState.originalStartDay + dayDelta))
          return { ...task, startDay: newStartDay }
        } else if (dragState.mode === 'resize-right') {
          const newDuration = Math.max(1, Math.min(totalDays - dragState.originalStartDay, dragState.originalDurationDays + dayDelta))
          return { ...task, durationDays: newDuration }
        } else if (dragState.mode === 'resize-left') {
          const minStart = getMinStartDay(task.id)
          const maxLeftShift = dragState.originalStartDay - minStart
          const maxRightShift = dragState.originalDurationDays - 1
          const clampedDelta = Math.max(-maxLeftShift, Math.min(maxRightShift, dayDelta))
          return { ...task, startDay: dragState.originalStartDay + clampedDelta, durationDays: dragState.originalDurationDays - clampedDelta }
        }
        return task
      })
      return cascadeDependencies(updatedTasks, dragState.taskId)
    })
  }, [dragState, gridDimensions.width, totalDays, dependencies])

  const handleDragEnd = useCallback(() => setDragState(null), [])

  useEffect(() => {
    const handleMove = (e) => { if (dragState) { if (e.type === 'touchmove') e.preventDefault(); handleDragMove(e) } }
    const handleEnd = () => handleDragEnd()
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }
  }, [dragState, handleDragMove, handleDragEnd])

  const addCategory = () => {
    const newId = `cat-${Date.now()}`
    setCategories([...categories, { id: newId, name: 'New Category' }])
    setEditingCategory(newId)
  }

  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    setTasks(prev => prev.filter(t => t.categoryId !== id))
  }

  const addTask = () => {
    // Validation with feedback
    if (!taskForm.name) { alert('Please enter a task name'); return }
    if (!taskForm.categoryId) { alert('Please select a category (add one first if none exist)'); return }
    if (!taskForm.assignee) { alert('Please select an assignee (add one first if none exist)'); return }
    
    const assigneeData = assignees.find(a => a.name === taskForm.assignee)
    const isUnscheduled = taskForm.startDay === null || taskForm.startDay === undefined || taskForm.startDay === 'unscheduled'
    
    if (editingTaskId) {
      setTasks(prev => prev.map(t => t.id === editingTaskId ? {
        ...t,
        name: taskForm.name,
        categoryId: taskForm.categoryId,
        startDay: isUnscheduled ? null : parseInt(taskForm.startDay),
        durationDays: parseInt(taskForm.durationDays),
        assignee: taskForm.assignee,
        color: assigneeData?.color || '#666',
        isMilestone: taskForm.isMilestone
      } : t))
    } else {
      setTasks([...tasks, {
        id: `task-${Date.now()}`,
        name: taskForm.name,
        categoryId: taskForm.categoryId,
        startDay: isUnscheduled ? null : parseInt(taskForm.startDay),
        durationDays: parseInt(taskForm.durationDays),
        assignee: taskForm.assignee,
        color: assigneeData?.color || '#666',
        isMilestone: taskForm.isMilestone
      }])
    }
    setShowTaskModal(false)
    setEditingTaskId(null)
    setTaskForm({ name: '', categoryId: '', startDay: 0, durationDays: 5, assignee: '', isMilestone: false })
  }

  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setDependencies(prev => prev.filter(d => d.fromTaskId !== taskId && d.toTaskId !== taskId))
    setSelectedTask(null)
  }

  const handleTaskClick = (e, task) => {
    e.stopPropagation()
    if (dragState) return
    if (creatingDependency) {
      if (creatingDependency !== task.id && !dependencies.some(d => d.fromTaskId === creatingDependency && d.toTaskId === task.id)) {
        setDependencies([...dependencies, { id: `dep-${Date.now()}`, fromTaskId: creatingDependency, toTaskId: task.id }])
      }
      setCreatingDependency(null)
    } else {
      setSelectedTask(selectedTask === task.id ? null : task.id)
    }
  }

  const addAssignee = () => {
    if (!newAssigneeName.trim()) return
    setAssignees([...assignees, { name: newAssigneeName.trim(), color: newAssigneeColor }])
    setNewAssigneeName('')
    setNewAssigneeColor('#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'))
    setShowAssigneeModal(false)
  }

  const exportTaskList = () => {
    const exportRows = tasks.map(task => {
      const category = categories.find(c => c.id === task.categoryId)
      if (task.startDay === null || task.startDay === undefined) {
        return { Category: category?.name || '', 'Task Name': task.name, 'Assigned To': task.assignee, Start: '', Finish: '' }
      }
      const weekIndex = Math.floor(task.startDay / DAYS_PER_WEEK)
      const dayInWeek = task.startDay % DAYS_PER_WEEK
      const startDateObj = new Date(weeks[weekIndex] || weeks[0])
      startDateObj.setDate(startDateObj.getDate() + dayInWeek)
      const endDateObj = new Date(startDateObj)
      endDateObj.setDate(endDateObj.getDate() + task.durationDays - 1)
      return { Category: category?.name || '', 'Task Name': task.name, 'Assigned To': task.assignee, Start: startDateObj.toISOString().split('T')[0], Finish: endDateObj.toISOString().split('T')[0] }
    })
    const csv = ['Category,Task Name,Assigned To,Start,Finish', ...exportRows.map(row => `"${row.Category}","${row['Task Name']}","${row['Assigned To']}","${row.Start}","${row.Finish}"`)].join('\n')
    setExportData(csv)
    setShowExportModal(true)
  }

  const renderDependencies = () => {
    if (gridDimensions.width === 0) return null
    const dayWidth = gridDimensions.width / totalDays
    return dependencies.map(dep => {
      const fromTask = tasks.find(t => t.id === dep.fromTaskId)
      const toTask = tasks.find(t => t.id === dep.toTaskId)
      if (!fromTask || !toTask || fromTask.startDay === null || toTask.startDay === null) return null
      const fromCatIndex = categories.findIndex(c => c.id === fromTask.categoryId)
      const toCatIndex = categories.findIndex(c => c.id === toTask.categoryId)
      if (fromCatIndex === -1 || toCatIndex === -1) return null
      const x1 = (fromTask.startDay + fromTask.durationDays) * dayWidth
      const y1 = fromCatIndex * ROW_HEIGHT + ROW_HEIGHT / 2
      const x2 = toTask.startDay * dayWidth
      const y2 = toCatIndex * ROW_HEIGHT + ROW_HEIGHT / 2
      const controlOffset = Math.abs(y2 - y1) * 0.5 + 20
      return (
        <g key={dep.id} className="cursor-pointer" onClick={() => setDependencies(prev => prev.filter(d => d.id !== dep.id))}>
          <path d={`M ${x1 + 10} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2 - 5} ${y2}`} stroke="#ef4444" strokeWidth="3" fill="none" />
          <polygon points={`${x2 - 5},${y2} ${x2 - 15},${y2 - 6} ${x2 - 15},${y2 + 6}`} fill="#ef4444" />
          <path d={`M ${x1 + 10} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2 - 5} ${y2}`} stroke="transparent" strokeWidth="15" fill="none" />
        </g>
      )
    })
  }

  const unscheduledTasks = tasks.filter(t => t.startDay === null || t.startDay === undefined)

  return (
    <div className="select-none">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-600">Start:</label>
            <input type="date" value={startDate.toISOString().split('T')[0]} onChange={(e) => setStartDate(new Date(e.target.value))} className="border rounded px-2 py-1 text-xs w-32" />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-600">Weeks:</label>
            <input type="number" value={numWeeks} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 1) setNumWeeks(val) }} className="border rounded px-2 py-1 text-xs w-16" min="1" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setTaskForm({ name: '', categoryId: '', startDay: 0, durationDays: 5, assignee: '' }); setEditingTaskId(null); setShowTaskModal(true) }} className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-xs font-medium">+ Task</button>
          <button onClick={addCategory} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs font-medium">+ Category</button>
          <button onClick={() => setShowAssigneeModal(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 text-xs font-medium">+ Assignee</button>
          <button onClick={() => setShowImportModal(true)} className="bg-slate-600 text-white px-3 py-1.5 rounded hover:bg-slate-700 text-xs font-medium">📁 Import</button>
          <button onClick={exportTaskList} className="bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 text-xs font-medium">📊 Export</button>
          <button onClick={() => setShowPrintPreview(true)} className="bg-rose-600 text-white px-3 py-1.5 rounded hover:bg-rose-700 text-xs font-medium">🖨️ PDF</button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-3 mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-700">Assignees:</span>
          {assignees.map((a, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: a.color }} />
              <span className="text-xs text-slate-600">{a.name}</span>
            </div>
          ))}
          {assignees.length === 0 && <span className="text-xs text-slate-400">None yet - add assignees above</span>}
          <div className="flex items-center gap-1 ml-4">
            <div className="w-6 h-0.5 bg-red-500" />
            <span className="text-xs text-slate-600">Dependency</span>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <span className="text-yellow-400">⭐</span>
            <span className="text-xs text-slate-600">Milestone</span>
          </div>
        </div>
        {creatingDependency && (
          <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">⚡ Click another task to create dependency, or click empty area to cancel</div>
        )}
      </div>

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <h3 className="text-sm font-medium text-amber-800 mb-2">📋 Not Scheduled ({unscheduledTasks.length})</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledTasks.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.effectAllowed = 'move' }}
                onClick={(e) => handleTaskClick(e, task)}
                className={`px-3 py-2 rounded text-white text-xs cursor-move shadow ${selectedTask === task.id ? 'ring-2 ring-blue-400' : ''}`}
                style={{ backgroundColor: task.color }}
              >
                {task.isMilestone && <span className="mr-1">⭐</span>}{task.name}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-2">Drag tasks onto the timeline to schedule them</p>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg shadow overflow-x-auto" onClick={() => { setCreatingDependency(null); setSelectedTask(null) }}>
        <div style={{ minWidth: `${DRAG_HANDLE_WIDTH + CATEGORY_WIDTH + (numWeeks * 80)}px` }}>
          {/* Headers */}
          <div className="flex border-b-2 border-slate-300 bg-slate-800 sticky top-0 z-10">
            <div className="flex-shrink-0 bg-slate-800 border-r border-slate-600" style={{ width: DRAG_HANDLE_WIDTH }} />
            <div className="flex-shrink-0 p-2 font-bold text-white text-xs border-r border-slate-600" style={{ width: CATEGORY_WIDTH }}>Category</div>
            <div className="flex-1 flex" style={{ minWidth: `${numWeeks * 80}px` }}>
              {weeks.map((date, idx) => (
                <div key={idx} className="border-r-2 border-slate-600 bg-slate-800" style={{ width: `${100 / numWeeks}%`, minWidth: '80px' }}>
                  <div className="text-center text-xs font-medium text-white py-0.5 border-b border-slate-600"><span className="hidden md:inline">W/C </span>{formatWeekHeader(date)}</div>
                  <div className="flex">
                    {['M', 'T', 'W', 'T', 'F'].map((day, dayIdx) => (
                      <div key={dayIdx} className={`flex-1 text-center text-xs text-slate-400 py-0.5 ${dayIdx < 4 ? 'border-r border-slate-700' : ''}`}>{day}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {categories.map((category, catIndex) => (
              <div
                key={category.id}
                className={`flex border-b border-slate-200 ${draggedCategory === category.id ? 'opacity-50' : ''}`}
                style={{ height: ROW_HEIGHT }}
                onDragOver={(e) => { e.preventDefault(); if (draggedCategory && draggedCategory !== category.id) e.dataTransfer.dropEffect = 'move' }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedCategory && draggedCategory !== category.id) {
                    setCategories(prev => {
                      const newCats = [...prev]
                      const draggedIdx = newCats.findIndex(c => c.id === draggedCategory)
                      const targetIdx = newCats.findIndex(c => c.id === category.id)
                      const [removed] = newCats.splice(draggedIdx, 1)
                      newCats.splice(targetIdx, 0, removed)
                      return newCats
                    })
                  }
                  setDraggedCategory(null)
                }}
              >
                {/* Drag Handle */}
                <div
                  className="flex-shrink-0 border-r border-slate-200 bg-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-200"
                  style={{ width: DRAG_HANDLE_WIDTH }}
                  draggable
                  onDragStart={(e) => { setDraggedCategory(category.id); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => setDraggedCategory(null)}
                >
                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                  </svg>
                </div>

                {/* Category Name */}
                <div className="flex-shrink-0 p-2 border-r border-slate-200 bg-slate-50 flex items-center justify-between group" style={{ width: CATEGORY_WIDTH }}>
                  {editingCategory === category.id ? (
                    <input autoFocus value={category.name} onChange={(e) => setCategories(prev => prev.map(c => c.id === category.id ? { ...c, name: e.target.value } : c))} onBlur={() => setEditingCategory(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingCategory(null)} className="flex-1 px-1 py-0.5 border rounded text-xs w-full" />
                  ) : (
                    <>
                      <span className="font-medium text-slate-800 cursor-pointer text-xs leading-tight" onClick={(e) => { e.stopPropagation(); setEditingCategory(category.id) }}>{category.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteCategory(category.id) }} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-sm ml-1">×</button>
                    </>
                  )}
                </div>

                {/* Grid Area */}
                <div
                  ref={catIndex === 0 ? gridContainerRef : null}
                  className="flex-1 relative"
                  style={{ minWidth: `${numWeeks * 80}px` }}
                  onDragOver={(e) => { if (!draggedCategory) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                  onDrop={(e) => {
                    if (draggedCategory) return
                    e.preventDefault()
                    const taskId = e.dataTransfer.getData('taskId')
                    if (!taskId) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const dayWidth = rect.width / totalDays
                    const dropDay = Math.max(0, Math.min(totalDays - 1, Math.floor(x / dayWidth)))
                    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, startDay: dropDay, categoryId: category.id } : t))
                  }}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {weeks.map((_, weekIdx) => (
                      <div key={weekIdx} className="flex border-r-2 border-slate-200" style={{ width: `${100 / numWeeks}%`, minWidth: '80px' }}>
                        {[0, 1, 2, 3, 4].map(dayIdx => (
                          <div key={dayIdx} className={`flex-1 ${dayIdx < 4 ? 'border-r border-slate-100' : ''}`} />
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Tasks */}
                  {tasks.filter(t => t.categoryId === category.id && t.startDay !== null && t.startDay !== undefined).map(task => {
                    const style = getTaskStyle(task)
                    const isSelected = selectedTask === task.id
                    const isCreatingFrom = creatingDependency === task.id
                    const isDragging = dragState?.taskId === task.id
                    return (
                      <div
                        key={task.id}
                        className={`absolute top-3 bottom-3 rounded-l flex items-center text-white font-medium shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${isCreatingFrom ? 'ring-2 ring-amber-400 ring-offset-1' : ''} ${isDragging ? 'opacity-80 shadow-lg' : ''}`}
                        style={{ ...style, backgroundColor: task.color, minWidth: '50px', touchAction: 'none', zIndex: isDragging ? 20 : 10 }}
                        onClick={(e) => handleTaskClick(e, task)}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none" onMouseDown={(e) => handleDragStart(e, task, 'resize-left')} onTouchStart={(e) => handleDragStart(e, task, 'resize-left')}>
                          <div className="w-1 h-8 bg-white bg-opacity-40 rounded" />
                        </div>
                        <div className="flex-1 px-3 cursor-move touch-none text-center truncate leading-tight text-xs" onMouseDown={(e) => handleDragStart(e, task, 'move')} onTouchStart={(e) => handleDragStart(e, task, 'move')}>{task.name}</div>
                        <div className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none" onMouseDown={(e) => handleDragStart(e, task, 'resize-right')} onTouchStart={(e) => handleDragStart(e, task, 'resize-right')}>
                          <div className="w-1 h-8 bg-white bg-opacity-40 rounded" />
                        </div>
                        <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ width: 0, height: 0, borderTop: '16px solid transparent', borderBottom: '16px solid transparent', borderLeft: `14px solid ${task.color}` }} />
                        {task.isMilestone && (
                          <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 pointer-events-none text-yellow-400 text-lg" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>⭐</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <div className="text-4xl mb-2">📋</div>
                <p>No categories yet. Click "+ Category" to add one.</p>
              </div>
            )}

            {/* Dependencies SVG */}
            <svg className="absolute top-0 pointer-events-none" style={{ left: DRAG_HANDLE_WIDTH + CATEGORY_WIDTH, width: `calc(100% - ${DRAG_HANDLE_WIDTH + CATEGORY_WIDTH}px)`, minWidth: `${numWeeks * 80}px`, height: categories.length * ROW_HEIGHT, overflow: 'visible' }}>
              <g style={{ pointerEvents: 'auto' }}>{renderDependencies()}</g>
            </svg>
          </div>
        </div>
      </div>

      {/* Selected Task Actions */}
      {selectedTask && (() => {
        const task = tasks.find(t => t.id === selectedTask)
        const taskDeps = dependencies.filter(d => d.fromTaskId === selectedTask || d.toTaskId === selectedTask)
        return (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 z-50 border border-slate-200">
            <div className="flex gap-2 flex-wrap justify-center">
              {task?.startDay !== null && (
                <button onClick={() => { setCreatingDependency(selectedTask); setSelectedTask(null) }} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-xs font-medium">🔗 Add Link</button>
              )}
              <button onClick={() => { const t = tasks.find(x => x.id === selectedTask); if (t) { setTaskForm({ name: t.name, categoryId: t.categoryId, startDay: t.startDay ?? 'unscheduled', durationDays: t.durationDays, assignee: t.assignee, isMilestone: t.isMilestone || false }); setEditingTaskId(selectedTask); setShowTaskModal(true); setSelectedTask(null) } }} className="bg-amber-600 text-white px-3 py-2 rounded hover:bg-amber-700 text-xs font-medium">✏️ Edit</button>
              {task?.startDay !== null && (
                <button onClick={() => { setTasks(prev => prev.map(t => t.id === selectedTask ? { ...t, startDay: null } : t)); setSelectedTask(null) }} className="bg-slate-600 text-white px-3 py-2 rounded hover:bg-slate-700 text-xs font-medium">📤 Unschedule</button>
              )}
              {taskDeps.length > 0 && (
                <button onClick={() => { setDependencies(prev => prev.filter(d => d.fromTaskId !== selectedTask && d.toTaskId !== selectedTask)); setSelectedTask(null) }} className="bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 text-xs font-medium">✂️ Remove Links</button>
              )}
              <button onClick={() => deleteTask(selectedTask)} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-xs font-medium">🗑️ Delete</button>
              <button onClick={() => setSelectedTask(null)} className="bg-slate-400 text-white px-3 py-2 rounded hover:bg-slate-500 text-xs font-medium">✕</button>
            </div>
          </div>
        )
      })()}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
            {(categories.length === 0 || assignees.length === 0) && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                ⚠️ {categories.length === 0 && 'Add a category first. '}{assignees.length === 0 && 'Add an assignee first.'}
              </div>
            )}
            <div className="space-y-3">
              <input type="text" value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="Task name *" />
              <select value={taskForm.categoryId} onChange={(e) => setTaskForm({ ...taskForm, categoryId: e.target.value })} className={`w-full border rounded px-3 py-2 text-sm ${categories.length === 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
                <option value="">{categories.length === 0 ? '⚠️ No categories - add one first' : 'Select category *'}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} className={`w-full border rounded px-3 py-2 text-sm ${assignees.length === 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
                <option value="">{assignees.length === 0 ? '⚠️ No assignees - add one first' : 'Select assignee *'}</option>
                {assignees.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={taskForm.startDay === null || taskForm.startDay === 'unscheduled' ? 'unscheduled' : Math.floor(taskForm.startDay / DAYS_PER_WEEK)} onChange={(e) => { if (e.target.value === 'unscheduled') { setTaskForm({ ...taskForm, startDay: 'unscheduled' }) } else { setTaskForm({ ...taskForm, startDay: parseInt(e.target.value) * DAYS_PER_WEEK }) } }} className="flex-1 border rounded px-2 py-2 text-sm">
                  <option value="unscheduled">Not scheduled</option>
                  {weeks.map((date, idx) => <option key={idx} value={idx}>Week {formatWeekHeader(date)}</option>)}
                </select>
                <input type="number" value={taskForm.durationDays} onChange={(e) => setTaskForm({ ...taskForm, durationDays: parseInt(e.target.value) || 1 })} className="w-20 border rounded px-2 py-2 text-sm" min="1" placeholder="Days" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={taskForm.isMilestone} onChange={(e) => setTaskForm({ ...taskForm, isMilestone: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                <span className="text-sm">⭐ Mark as Milestone</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowTaskModal(false); setEditingTaskId(null) }} className="px-4 py-2 border rounded hover:bg-slate-100 text-sm">Cancel</button>
              <button onClick={addTask} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm">{editingTaskId ? 'Save' : 'Add Task'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignee Modal */}
      {showAssigneeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">Add New Assignee</h2>
            <div className="space-y-3">
              <input type="text" value={newAssigneeName} onChange={(e) => setNewAssigneeName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Name" autoFocus />
              <div className="flex items-center gap-3">
                <input type="color" value={newAssigneeColor} onChange={(e) => setNewAssigneeColor(e.target.value)} className="w-12 h-10 border rounded cursor-pointer" />
                <div className="flex gap-1 flex-wrap">
                  {['#2d5a3d', '#d4820e', '#4a7c59', '#1e3a5f', '#8b6914', '#7c3aed', '#dc2626', '#0891b2'].map(color => (
                    <button key={color} onClick={() => setNewAssigneeColor(color)} className={`w-6 h-6 rounded ${newAssigneeColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowAssigneeModal(false); setNewAssigneeName('') }} className="px-4 py-2 border rounded hover:bg-slate-100 text-sm">Cancel</button>
              <button onClick={addAssignee} disabled={!newAssigneeName.trim()} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm disabled:opacity-50">Add Assignee</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-3">Export Task List</h2>
            <textarea readOnly value={exportData} className="w-full border rounded px-3 py-2 text-xs font-mono bg-slate-50 h-48" onClick={(e) => e.target.select()} />
            <div className="flex justify-between mt-4">
              <button onClick={() => { navigator.clipboard?.writeText(exportData) }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">📋 Copy</button>
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 border rounded hover:bg-slate-100 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">Import Tasks from CSV</h2>
            <p className="text-xs text-slate-600 mb-3">CSV format: Category, Task Name, Assigned To, Start, Finish</p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input type="file" accept=".csv" onChange={(e) => {
                const file = e.target.files[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (event) => {
                  try {
                    const text = event.target.result
                    const lines = text.split('\n').filter(l => l.trim())
                    const parseCSVLine = (line) => {
                      const values = []; let current = ''; let inQuotes = false
                      for (let i = 0; i < line.length; i++) {
                        const char = line[i]
                        if (char === '"') inQuotes = !inQuotes
                        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
                        else current += char
                      }
                      values.push(current.trim())
                      return values
                    }
                    const headers = parseCSVLine(lines[0])
                    const newCats = [...categories], newAssignees = [...assignees], importedTasks = []
                    const catNames = new Set(categories.map(c => c.name))
                    for (let i = 1; i < lines.length; i++) {
                      const values = parseCSVLine(lines[i])
                      const row = {}; headers.forEach((h, idx) => row[h] = values[idx] || '')
                      const catName = row['Category'] || 'Imported'
                      if (!catNames.has(catName)) { catNames.add(catName); newCats.push({ id: `cat-${Date.now()}-${i}`, name: catName }) }
                      const cat = newCats.find(c => c.name === catName)
                      const assignee = row['Assigned To'] || row['Assignee'] || 'Unassigned'
                      let assigneeData = newAssignees.find(a => a.name === assignee)
                      if (!assigneeData) { assigneeData = { name: assignee, color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') }; newAssignees.push(assigneeData) }
                      const startStr = row['Start'] || row['Start Date'] || ''
                      let startDay = null, durationDays = 5
                      if (startStr) {
                        const taskStart = new Date(startStr)
                        for (let w = 0; w < weeks.length; w++) {
                          const weekStart = weeks[w], weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 4)
                          if (taskStart >= weekStart && taskStart <= weekEnd) { startDay = w * DAYS_PER_WEEK + Math.min(Math.floor((taskStart - weekStart) / 86400000), 4); break }
                          else if (taskStart < weekStart) { startDay = w * DAYS_PER_WEEK; break }
                          startDay = (w + 1) * DAYS_PER_WEEK - 1
                        }
                        const endStr = row['Finish'] || row['End Date'] || ''
                        if (endStr) durationDays = Math.max(1, Math.round((new Date(endStr) - new Date(startStr)) / 86400000) + 1)
                      }
                      importedTasks.push({ id: `task-${Date.now()}-${i}`, name: row['Task Name'] || row['Task'] || 'Untitled', categoryId: cat.id, startDay, durationDays, assignee, color: assigneeData.color })
                    }
                    setCategories(newCats); setAssignees(newAssignees); setTasks(prev => [...prev, ...importedTasks]); setShowImportModal(false)
                  } catch (err) { alert('Error parsing CSV') }
                }
                reader.readAsText(file)
              }} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">Click to select CSV file</label>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded hover:bg-slate-100 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Print Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const printContent = document.getElementById('print-area')
                    const iframe = document.createElement('iframe')
                    iframe.style.position = 'absolute'
                    iframe.style.top = '-10000px'
                    iframe.style.left = '-10000px'
                    document.body.appendChild(iframe)
                    const doc = iframe.contentDocument || iframe.contentWindow.document
                    doc.open()
                    doc.write(`
                      <html>
                        <head>
                          <title>Project Plan</title>
                          <style>
                            body { font-family: system-ui, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            table { width: 100%; border-collapse: collapse; font-size: 11px; }
                            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                            th { background: #374151 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .task-bar { height: 24px; border-radius: 4px; color: white !important; font-size: 10px; display: flex; align-items: center; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { background: #374151 !important; color: white !important; } .task-bar { color: white !important; } }
                          </style>
                        </head>
                        <body>${printContent.innerHTML}</body>
                      </html>
                    `)
                    doc.close()
                    iframe.contentWindow.focus()
                    setTimeout(() => { iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe) }, 1000) }, 250)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >🖨️ Print</button>
                <button onClick={() => setShowPrintPreview(false)} className="px-4 py-2 border rounded hover:bg-slate-100 text-sm">Close</button>
              </div>
            </div>
            
            <div id="print-area" className="bg-white">
              <h1 className="text-xl font-bold mb-4 text-center">Project Plan</h1>
              <p className="text-sm text-slate-600 mb-4 text-center">Start: {startDate.toLocaleDateString()} | {numWeeks} weeks</p>
              
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-slate-300 bg-slate-700 text-white p-2 w-32">Category</th>
                    {weeks.map((date, idx) => (
                      <th key={idx} className="border border-slate-300 bg-slate-700 text-white p-1 text-center" style={{minWidth: '50px'}}>{formatWeekHeader(date)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <tr key={category.id}>
                      <td className="border border-slate-300 p-2 font-medium bg-slate-50">{category.name}</td>
                      {weeks.map((_, weekIdx) => {
                        const weekStartDay = weekIdx * DAYS_PER_WEEK
                        const weekEndDay = weekStartDay + DAYS_PER_WEEK
                        const tasksInCell = tasks.filter(t => t.categoryId === category.id && t.startDay !== null && t.startDay !== undefined && t.startDay >= weekStartDay && t.startDay < weekEndDay)
                        const continuingTasks = tasks.filter(t => t.categoryId === category.id && t.startDay !== null && t.startDay !== undefined && t.startDay < weekStartDay && t.startDay + t.durationDays > weekStartDay)
                        return (
                          <td key={weekIdx} className="border border-slate-300 p-1 relative" style={{height: '50px', verticalAlign: 'middle'}}>
                            {tasksInCell.map(task => {
                              const dayOffsetInWeek = task.startDay - weekStartDay
                              const durationWeeks = task.durationDays / DAYS_PER_WEEK
                              return (
                                <div key={task.id} className="task-bar px-1" style={{ backgroundColor: task.color, color: '#ffffff', position: 'absolute', left: `calc(${dayOffsetInWeek * 20}% + 2px)`, top: '4px', bottom: '4px', width: `calc(${durationWeeks * 100}% - 4px)`, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '9px', borderRadius: '3px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{task.name}</div>
                              )
                            })}
                            {continuingTasks.length > 0 && tasksInCell.length === 0 && <div className="w-full h-6 bg-slate-200 rounded opacity-30" />}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6">
                <h3 className="font-bold mb-2">Task List</h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 p-2 text-left">Task</th>
                      <th className="border border-slate-300 bg-slate-100 p-2 text-left">Category</th>
                      <th className="border border-slate-300 bg-slate-100 p-2 text-left">Assignee</th>
                      <th className="border border-slate-300 bg-slate-100 p-2 text-left">Start</th>
                      <th className="border border-slate-300 bg-slate-100 p-2 text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.filter(t => t.startDay !== null && t.startDay !== undefined).map(task => {
                      const category = categories.find(c => c.id === task.categoryId)
                      const weekIndex = Math.floor(task.startDay / DAYS_PER_WEEK)
                      const dayInWeek = task.startDay % DAYS_PER_WEEK
                      const taskStartDate = new Date(weeks[weekIndex] || weeks[0])
                      taskStartDate.setDate(taskStartDate.getDate() + dayInWeek)
                      return (
                        <tr key={task.id}>
                          <td className="border border-slate-300 p-2">{task.isMilestone && '⭐ '}{task.name}</td>
                          <td className="border border-slate-300 p-2">{category?.name}</td>
                          <td className="border border-slate-300 p-2"><span className="inline-block w-2 h-2 rounded mr-1" style={{backgroundColor: task.color}} />{task.assignee}</td>
                          <td className="border border-slate-300 p-2">{taskStartDate?.toLocaleDateString()}</td>
                          <td className="border border-slate-300 p-2">{task.durationDays} day{task.durationDays > 1 ? 's' : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <span className="text-xs font-medium">Legend:</span>
                {assignees.filter(a => tasks.some(t => t.assignee === a.name && t.startDay !== null && t.startDay !== undefined)).map(a => (
                  <div key={a.name} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{backgroundColor: a.color}} />
                    <span className="text-xs">{a.name}</span>
                  </div>
                ))}
                {tasks.some(t => t.isMilestone) && (
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span className="text-xs">Milestone</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 bg-white rounded-lg shadow p-3 text-xs text-slate-600">
        <h3 className="font-bold text-slate-800 mb-2">How to use:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          <div>• <strong>Drag tasks</strong> to move them (snaps to days M-F)</div>
          <div>• <strong>Drag edges</strong> to resize duration</div>
          <div>• <strong>Click task</strong> to select → add link, edit, or delete</div>
          <div>• <strong>Red arrows</strong> show dependencies (click to delete)</div>
          <div>• <strong>Drag categories</strong> using the handle to reorder</div>
          <div>• <strong>Unscheduled tasks</strong> can be dragged onto timeline</div>
          <div>• <strong>⭐ Milestones</strong> mark key deliverables (set when adding/editing task)</div>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function Home() {
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectTags, setProjectTags] = useState({})
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [categories, setCategories] = useState([])
  const [tasks, setTasks] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [assignees, setAssignees] = useState([])
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  const [numWeeks, setNumWeeks] = useState(14)

  const autoSaveRef = useRef(null)
  const refreshListRef = useRef(null)

  const loadProject = async (id) => {
    if (!id) {
      setCurrentProjectId(null)
      setProjectName('')
      setProjectDescription('')
      setProjectTags({})
      setCategories([])
      setTasks([])
      setDependencies([])
      setAssignees([])
      return
    }
    const r = await api.getProject(id)
    if (r.success) {
      const { data, name, description, tags } = r.project
      setCurrentProjectId(id)
      setProjectName(name)
      setProjectDescription(description || '')
      setProjectTags(tags || {})
      setCategories(data.categories || [])
      setTasks(data.tasks || [])
      setDependencies(data.dependencies || [])
      setAssignees(data.assignees || [])
      setStartDate(new Date(data.startDate || Date.now()))
      setNumWeeks(data.numWeeks || 14)
      setSaveStatus('saved')
    }
  }

  const saveProject = useCallback(async () => {
    if (!currentProjectId) return
    setSaveStatus('saving')
    const data = { categories, tasks, dependencies, assignees, startDate: startDate.toISOString(), numWeeks }
    const r = await api.updateProject(currentProjectId, { data, tags: projectTags })
    setSaveStatus(r.success ? 'saved' : 'error')
  }, [currentProjectId, categories, tasks, dependencies, assignees, startDate, numWeeks, projectTags])

  useEffect(() => {
    if (!currentProjectId) return
    setSaveStatus('unsaved')
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(saveProject, 1500)
    return () => clearTimeout(autoSaveRef.current)
  }, [categories, tasks, dependencies, assignees, startDate, numWeeks])

  const createProject = async (data) => {
    const projectData = {
      categories: [{ id: 'cat-1', name: 'Phase 1' }],
      tasks: [],
      dependencies: [],
      assignees: [{ name: 'Team', color: '#3b82f6' }, { name: 'Client', color: '#10b981' }],
      startDate: new Date().toISOString(),
      numWeeks: 14
    }
    const r = await api.createProject({ ...data, data: projectData })
    if (r.success) {
      setShowNewModal(false)
      loadProject(r.project.id)
      if (refreshListRef.current) refreshListRef.current()
    }
  }

  const updateProjectInfo = async (updates) => {
    if (!currentProjectId) return
    await api.updateProject(currentProjectId, updates)
    setProjectName(updates.name)
    setProjectTags(updates.tags)
    setShowEditModal(false)
    if (refreshListRef.current) refreshListRef.current()
  }

  return (
    <div className="h-screen flex bg-slate-100">
      {sidebarOpen && <ProjectList onSelect={loadProject} onNew={() => setShowNewModal(true)} currentId={currentProjectId} refreshRef={refreshListRef} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded" title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>{sidebarOpen ? '◀' : '▶'}</button>
            {currentProjectId ? (
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  {projectName}
                  <button onClick={() => setShowEditModal(true)} className="text-sm text-slate-400 hover:text-slate-600" title="Edit project details">✏️</button>
                </h1>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {Object.entries(projectTags).map(([k,v]) => (
                    <span key={k} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{k}: {v}</span>
                  ))}
                </div>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-slate-400">Select or create a project</h1>
            )}
          </div>
          {currentProjectId && (
            <span className={`text-xs px-2 py-1 rounded ${saveStatus === 'saved' ? 'bg-green-100 text-green-700' : saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
            </span>
          )}
        </div>

        {currentProjectId ? (
          <div className="flex-1 overflow-auto p-4">
            <GanttPlanner
              categories={categories} setCategories={setCategories}
              tasks={tasks} setTasks={setTasks}
              dependencies={dependencies} setDependencies={setDependencies}
              assignees={assignees} setAssignees={setAssignees}
              startDate={startDate} setStartDate={setStartDate}
              numWeeks={numWeeks} setNumWeeks={setNumWeeks}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-lg">Select a project from the sidebar</p>
              <p className="text-sm mt-1">or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>

      {showNewModal && <NewProjectModal onSave={createProject} onClose={() => setShowNewModal(false)} />}
      {showEditModal && <EditProjectModal project={{ name: projectName, description: projectDescription }} tags={projectTags} onSave={updateProjectInfo} onClose={() => setShowEditModal(false)} />}
    </div>
  )
}
