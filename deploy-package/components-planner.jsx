import React, { useState, useRef, useEffect, useCallback } from 'react';

const ProjectPlanner = () => {
  // Get Monday of current week
  const getMondayOfCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const [categories, setCategories] = useState([]);

  const [tasks, setTasks] = useState([]);

  const [dependencies, setDependencies] = useState([]);

  const [assignees, setAssignees] = useState([]);

  const [startDate, setStartDate] = useState(getMondayOfCurrentWeek());
  const [numWeeks, setNumWeeks] = useState(14);
  const [dragState, setDragState] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [creatingDependency, setCreatingDependency] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: '', categoryId: '', startDay: 0, durationDays: 5, assignee: '' });
  const [gridDimensions, setGridDimensions] = useState({ width: 0, left: 0 });
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [newAssigneeColor, setNewAssigneeColor] = useState('#3b82f6');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState(null);

  const plannerRef = useRef(null);
  const gridContainerRef = useRef(null);

  // Update grid dimensions on resize and when weeks change
  useEffect(() => {
    const updateDimensions = () => {
      if (gridContainerRef.current) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        setGridDimensions({ width: rect.width, left: rect.left });
      }
    };
    
    // Use setTimeout to ensure DOM has updated after numWeeks change
    const timeoutId = setTimeout(updateDimensions, 50);
    
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
    };
  }, [categories, numWeeks]);

  const getWeekDates = () => {
    const weeks = [];
    for (let i = 0; i < numWeeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + i * 7);
      weeks.push(weekStart);
    }
    return weeks;
  };

  const formatWeekHeader = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  // Constants
  const DAYS_PER_WEEK = 5;
  const totalDays = numWeeks * DAYS_PER_WEEK;
  const ROW_HEIGHT = 85;
  const CATEGORY_WIDTH = 140;
  const DRAG_HANDLE_WIDTH = 24;

  const getTaskStyle = (task) => {
    const dayWidth = 100 / totalDays;
    return {
      left: `${task.startDay * dayWidth}%`,
      width: `calc(${task.durationDays * dayWidth}% - 8px)`,
    };
  };

  // Get client X from mouse or touch event
  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  };

  // Handle drag/resize start (mouse and touch)
  const handleDragStart = (e, task, mode = 'move') => {
    e.stopPropagation();
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
    
    const clientX = getClientX(e);
    setDragState({
      taskId: task.id,
      mode, // 'move', 'resize-left', 'resize-right'
      startX: clientX,
      originalStartDay: task.startDay,
      originalDurationDays: task.durationDays
    });
    setSelectedTask(null);
    setCreatingDependency(null);
  };

  // Handle drag/resize move
  const handleDragMove = useCallback((e) => {
    if (!dragState || gridDimensions.width === 0) return;
    
    const clientX = getClientX(e);
    const dayWidth = gridDimensions.width / totalDays;
    const deltaX = clientX - dragState.startX;
    const dayDelta = Math.round(deltaX / dayWidth);

    setTasks(prev => {
      let updatedTasks = prev.map(task => {
        if (task.id !== dragState.taskId) return task;

        if (dragState.mode === 'move') {
          // Get minimum start day based on dependencies this task depends on
          const minStart = getMinStartDay(task.id);
          const newStartDay = Math.max(minStart, Math.min(totalDays - dragState.originalDurationDays, dragState.originalStartDay + dayDelta));
          return { ...task, startDay: newStartDay };
        } else if (dragState.mode === 'resize-right') {
          const newDuration = Math.max(1, Math.min(totalDays - dragState.originalStartDay, dragState.originalDurationDays + dayDelta));
          return { ...task, durationDays: newDuration };
        } else if (dragState.mode === 'resize-left') {
          const minStart = getMinStartDay(task.id);
          const maxLeftShift = dragState.originalStartDay - minStart;
          const maxRightShift = dragState.originalDurationDays - 1;
          const clampedDelta = Math.max(-maxLeftShift, Math.min(maxRightShift, dayDelta));
          return {
            ...task,
            startDay: dragState.originalStartDay + clampedDelta,
            durationDays: dragState.originalDurationDays - clampedDelta
          };
        }
        return task;
      });

      // Cascade dependencies - move any dependent tasks if needed
      updatedTasks = cascadeDependencies(updatedTasks, dragState.taskId);
      
      return updatedTasks;
    });
  }, [dragState, gridDimensions.width, totalDays, dependencies]);

  // Handle drag/resize end
  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  // Event listeners for mouse and touch
  useEffect(() => {
    const handleMove = (e) => {
      if (dragState) {
        if (e.type === 'touchmove') {
          e.preventDefault();
        }
        handleDragMove(e);
      }
    };

    const handleEnd = () => {
      handleDragEnd();
    };

    // Mouse events
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    // Touch events
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  const addCategory = () => {
    const newId = `cat-${Date.now()}`;
    setCategories([...categories, { id: newId, name: 'New Category' }]);
    setEditingCategory(newId);
  };

  const updateCategoryName = (id, name) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.filter(t => t.categoryId !== id));
  };

  const addTask = () => {
    if (!taskForm.name || !taskForm.categoryId || !taskForm.assignee) return;
    const assigneeData = assignees.find(a => a.name === taskForm.assignee);
    const isUnscheduled = taskForm.startDay === null || taskForm.startDay === undefined;
    const newTask = {
      id: `task-${Date.now()}`,
      name: taskForm.name,
      categoryId: taskForm.categoryId,
      startDay: isUnscheduled ? null : parseInt(taskForm.startDay),
      durationDays: parseInt(taskForm.durationDays),
      assignee: taskForm.assignee,
      color: assigneeData?.color || '#666'
    };
    setTasks([...tasks, newTask]);
    setShowTaskModal(false);
    setEditingTaskId(null);
    setTaskForm({ name: '', categoryId: '', startDay: 0, durationDays: 5, assignee: '' });
  };

  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDependencies(prev => prev.filter(d => d.fromTaskId !== taskId && d.toTaskId !== taskId));
    setSelectedTask(null);
  };

  const handleTaskClick = (e, task) => {
    e.stopPropagation();
    if (dragState) return;
    
    if (creatingDependency) {
      if (creatingDependency !== task.id) {
        const exists = dependencies.some(d => 
          d.fromTaskId === creatingDependency && d.toTaskId === task.id
        );
        if (!exists) {
          const newDep = {
            id: `dep-${Date.now()}`,
            fromTaskId: creatingDependency,
            toTaskId: task.id
          };
          setDependencies([...dependencies, newDep]);
        }
      }
      setCreatingDependency(null);
    } else {
      setSelectedTask(selectedTask === task.id ? null : task.id);
    }
  };

  const startDependencyCreation = (taskId) => {
    setCreatingDependency(taskId);
    setSelectedTask(null);
  };

  const deleteDependency = (depId) => {
    setDependencies(prev => prev.filter(d => d.id !== depId));
  };

  const addAssignee = () => {
    if (!newAssigneeName.trim()) return;
    setAssignees([...assignees, { name: newAssigneeName.trim(), color: newAssigneeColor }]);
    setNewAssigneeName('');
    setNewAssigneeColor('#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
    setShowAssigneeModal(false);
  };

  const exportTaskList = () => {
    const exportRows = tasks.map(task => {
      const category = categories.find(c => c.id === task.categoryId);
      
      // Handle unscheduled tasks (startDay is null or undefined)
      if (task.startDay === null || task.startDay === undefined) {
        return {
          'Category': category?.name || '',
          'Task Name': task.name,
          'Assigned To': task.assignee,
          'Start': '',
          'Finish': ''
        };
      }
      
      // Calculate actual start date from startDay
      const weekIndex = Math.floor(task.startDay / DAYS_PER_WEEK);
      const dayInWeek = task.startDay % DAYS_PER_WEEK;
      const startDateObj = new Date(weeks[weekIndex] || weeks[0]);
      startDateObj.setDate(startDateObj.getDate() + dayInWeek);
      
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + task.durationDays - 1);
      
      return {
        'Category': category?.name || '',
        'Task Name': task.name,
        'Assigned To': task.assignee,
        'Start': startDateObj.toISOString().split('T')[0],
        'Finish': endDateObj.toISOString().split('T')[0]
      };
    });

    const csv = [
      'Category,Task Name,Assigned To,Start,Finish',
      ...exportRows.map(row => `"${row['Category']}","${row['Task Name']}","${row['Assigned To']}","${row['Start']}","${row['Finish']}"`)
    ].join('\n');

    setExportData(csv);
    setShowExportModal(true);
  };

  const importTasks = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // CSV parsing helper - handles quoted fields, unquoted fields with spaces, and empty fields
    const parseCSVLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Don't forget the last value
      return values;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = parseCSVLine(lines[0]);
        
        const importedTasks = [];
        const importedCategories = new Set(categories.map(c => c.name));
        const newCategories = [...categories];
        const newAssignees = [...assignees];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((h, idx) => row[h] = values[idx] || '');

          const categoryName = row['Category'] || 'Uncategorized';
          if (!importedCategories.has(categoryName)) {
            importedCategories.add(categoryName);
            newCategories.push({ id: `cat-${Date.now()}-${i}`, name: categoryName });
          }

          const category = newCategories.find(c => c.name === categoryName);
          // Support both old "Assignee" and new "Assigned To" column names
          const assignee = row['Assigned To'] || row['Assignee'] || 'Unassigned';
          let assigneeData = newAssignees.find(a => a.name === assignee);
          
          if (!assigneeData) {
            const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            assigneeData = { name: assignee, color };
            newAssignees.push(assigneeData);
          }

          // Support Start/Finish and Start Date/End Date column names
          const startDateStr = row['Start'] || row['Start Date'] || '';
          const endDateStr = row['Finish'] || row['End Date'] || '';
          
          // Check if task is unscheduled (no start date)
          let startDay = null;
          let durationDays = 5; // default duration
          
          if (startDateStr && startDateStr.trim() !== '') {
            const taskStartDate = new Date(startDateStr);
            
            // Calculate start day from date
            startDay = 0;
            for (let w = 0; w < weeks.length; w++) {
              const weekStart = weeks[w];
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 4); // Friday
              if (taskStartDate >= weekStart && taskStartDate <= weekEnd) {
                const dayInWeek = Math.floor((taskStartDate - weekStart) / (1000 * 60 * 60 * 24));
                startDay = w * DAYS_PER_WEEK + Math.min(dayInWeek, 4);
                break;
              } else if (taskStartDate < weekStart) {
                startDay = w * DAYS_PER_WEEK;
                break;
              }
              startDay = (w + 1) * DAYS_PER_WEEK - 1;
            }

            // Calculate duration from start and end dates
            if (endDateStr && endDateStr.trim() !== '') {
              const endDate = new Date(endDateStr);
              const startDateParsed = new Date(startDateStr);
              // Add 1 because end date is inclusive
              durationDays = Math.max(1, Math.round((endDate - startDateParsed) / (1000 * 60 * 60 * 24)) + 1);
            }
          } else if (row['Duration (days)']) {
            // Fallback for legacy imports with Duration column
            durationDays = parseInt(row['Duration (days)']) || 5;
          } else if (row['Duration (weeks)']) {
            durationDays = parseInt(row['Duration (weeks)']) * DAYS_PER_WEEK;
          }

          // Support both old "Task" and new "Task Name" column names
          importedTasks.push({
            id: `task-${Date.now()}-${i}`,
            name: row['Task Name'] || row['Task'] || 'Untitled',
            categoryId: category.id,
            startDay,
            durationDays,
            assignee,
            color: assigneeData.color
          });
        }

        setCategories(newCategories);
        setAssignees(newAssignees);
        setTasks(prev => [...prev, ...importedTasks]);
        setShowImportModal(false);
      } catch (err) {
        alert('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const weeks = getWeekDates();
  
  // Calculate adaptive font size based on text length and task width
  const getTaskFontSize = (task) => {
    const charsPerDay = 2; // approximate characters that fit per day at base size
    const availableSpace = task.durationDays * charsPerDay;
    const textLength = task.name.length;
    
    if (textLength <= availableSpace * 0.5) return '12px';
    if (textLength <= availableSpace * 0.75) return '11px';
    if (textLength <= availableSpace) return '10px';
    if (textLength <= availableSpace * 1.5) return '9px';
    return '8px';
  };

  // Get task end day
  const getTaskEndDay = (task) => task.startDay + task.durationDays;

  // Cascade dependencies when a task moves
  const cascadeDependencies = (updatedTasks, movedTaskId) => {
    let tasksMap = new Map(updatedTasks.map(t => [t.id, { ...t }]));
    let changed = true;
    let iterations = 0;
    const maxIterations = 100; // prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const dep of dependencies) {
        const fromTask = tasksMap.get(dep.fromTaskId);
        const toTask = tasksMap.get(dep.toTaskId);
        
        if (fromTask && toTask) {
          const fromEndDay = fromTask.startDay + fromTask.durationDays;
          // Only move if the dependent task starts before the primary ends
          if (toTask.startDay < fromEndDay) {
            tasksMap.set(toTask.id, { ...toTask, startDay: fromEndDay });
            changed = true;
          }
        }
      }
    }

    return Array.from(tasksMap.values());
  };

  // Check if moving a task would violate its own dependencies (tasks it depends on)
  const getMinStartDay = (taskId) => {
    let minStart = 0;
    for (const dep of dependencies) {
      if (dep.toTaskId === taskId) {
        const fromTask = tasks.find(t => t.id === dep.fromTaskId);
        if (fromTask) {
          const fromEnd = fromTask.startDay + fromTask.durationDays;
          minStart = Math.max(minStart, fromEnd);
        }
      }
    }
    return minStart;
  };

  // Calculate dependency arrow paths
  const renderDependencies = () => {
    if (gridDimensions.width === 0) return null;
    
    const dayWidth = gridDimensions.width / totalDays;
    
    return dependencies.map(dep => {
      const fromTask = tasks.find(t => t.id === dep.fromTaskId);
      const toTask = tasks.find(t => t.id === dep.toTaskId);
      if (!fromTask || !toTask) return null;

      const fromCatIndex = categories.findIndex(c => c.id === fromTask.categoryId);
      const toCatIndex = categories.findIndex(c => c.id === toTask.categoryId);
      if (fromCatIndex === -1 || toCatIndex === -1) return null;

      // Calculate pixel positions using days
      const x1 = (fromTask.startDay + fromTask.durationDays) * dayWidth;
      const y1 = fromCatIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const x2 = toTask.startDay * dayWidth;
      const y2 = toCatIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      // Create a curved path
      const controlOffset = Math.abs(y2 - y1) * 0.5 + 20;

      return (
        <g key={dep.id} className="cursor-pointer" onClick={() => deleteDependency(dep.id)}>
          <path
            d={`M ${x1 + 10} ${y1} 
                C ${x1 + controlOffset} ${y1}, 
                  ${x2 - controlOffset} ${y2}, 
                  ${x2 - 5} ${y2}`}
            stroke="#ef4444"
            strokeWidth="3"
            fill="none"
            strokeDasharray="none"
          />
          {/* Arrowhead */}
          <polygon
            points={`${x2 - 5},${y2} ${x2 - 15},${y2 - 6} ${x2 - 15},${y2 + 6}`}
            fill="#ef4444"
          />
          {/* Invisible wider path for easier clicking */}
          <path
            d={`M ${x1 + 10} ${y1} 
                C ${x1 + controlOffset} ${y1}, 
                  ${x2 - controlOffset} ${y2}, 
                  ${x2 - 5} ${y2}`}
            stroke="transparent"
            strokeWidth="15"
            fill="none"
          />
        </g>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4 select-none">
      <div className="max-w-full mx-auto">
        {/* Header Controls */}
        <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">Project Plan Builder</h1>
          
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-600">Start:</label>
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="border rounded px-2 py-1 text-xs w-32"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-600">Weeks:</label>
              <input
                type="number"
                value={numWeeks}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1) {
                    setNumWeeks(val);
                  }
                }}
                className="border rounded px-2 py-1 text-xs w-16"
                min="1"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setTaskForm({ name: '', categoryId: '', startDay: 0, durationDays: 5, assignee: '' });
                setEditingTaskId(null);
                setShowTaskModal(true);
              }}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-xs font-medium"
            >
              + Task
            </button>
            <button
              onClick={addCategory}
              className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs font-medium"
            >
              + Category
            </button>
            <button
              onClick={() => setShowAssigneeModal(true)}
              className="bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 text-xs font-medium"
            >
              + Assignee
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-slate-600 text-white px-3 py-1.5 rounded hover:bg-slate-700 text-xs font-medium"
            >
              📁 Import
            </button>
            <button
              onClick={exportTaskList}
              className="bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 text-xs font-medium"
            >
              📊 Export
            </button>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="bg-rose-600 text-white px-3 py-1.5 rounded hover:bg-rose-700 text-xs font-medium"
            >
              🖨️ PDF
            </button>
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
            <div className="flex items-center gap-1 ml-4">
              <div className="w-6 h-0.5 bg-red-500" />
              <span className="text-xs text-slate-600">Dependency</span>
            </div>
          </div>
          {creatingDependency && (
            <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">
              ⚡ Now tap another task to create dependency, or tap empty area to cancel
            </div>
          )}
        </div>

        {/* Main Planner */}
        <div 
          ref={plannerRef} 
          className="bg-white rounded-lg shadow overflow-x-auto print:shadow-none"
          onClick={() => { setCreatingDependency(null); setSelectedTask(null); }}
        >
          <div style={{ minWidth: `${DRAG_HANDLE_WIDTH + CATEGORY_WIDTH + (numWeeks * 80)}px` }}>
            {/* Week Headers with Day Labels */}
            <div className="flex border-b-2 border-slate-300 bg-slate-800 sticky top-0 z-10">
              <div 
                className="flex-shrink-0 bg-slate-800 border-r border-slate-600"
                style={{ width: DRAG_HANDLE_WIDTH, minWidth: DRAG_HANDLE_WIDTH }}
              />
              <div 
                className="flex-shrink-0 p-2 font-bold text-white text-xs border-r border-slate-600"
                style={{ width: CATEGORY_WIDTH, minWidth: CATEGORY_WIDTH }}
              >
                Category
              </div>
              <div className="flex-1 flex" style={{ minWidth: `${numWeeks * 80}px` }}>
                {weeks.map((date, idx) => (
                  <div
                    key={idx}
                    className="border-r-2 border-slate-600 bg-slate-800"
                    style={{ width: `${100 / numWeeks}%`, minWidth: '80px' }}
                  >
                    <div className="text-center text-xs font-medium text-white py-0.5 border-b border-slate-600">
                      <span className="hidden md:inline">W/C </span>{formatWeekHeader(date)}
                    </div>
                    <div className="flex">
                      {['M', 'T', 'W', 'T', 'F'].map((day, dayIdx) => (
                        <div 
                          key={dayIdx} 
                          className={`flex-1 text-center text-xs text-slate-400 py-0.5 ${dayIdx < 4 ? 'border-r border-slate-700' : ''}`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Rows with SVG overlay */}
            <div className="relative">
              {categories.map((category, catIndex) => (
                <div 
                  key={category.id} 
                  className={`flex border-b border-slate-200 ${draggedCategory === category.id ? 'opacity-50' : ''}`}
                  style={{ height: ROW_HEIGHT }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedCategory && draggedCategory !== category.id) {
                      e.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedCategory && draggedCategory !== category.id) {
                      // Reorder categories
                      setCategories(prev => {
                        const newCategories = [...prev];
                        const draggedIndex = newCategories.findIndex(c => c.id === draggedCategory);
                        const targetIndex = newCategories.findIndex(c => c.id === category.id);
                        const [removed] = newCategories.splice(draggedIndex, 1);
                        newCategories.splice(targetIndex, 0, removed);
                        return newCategories;
                      });
                    }
                    setDraggedCategory(null);
                  }}
                >
                  {/* Drag Handle */}
                  <div 
                    className="flex-shrink-0 border-r border-slate-200 bg-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-200"
                    style={{ width: DRAG_HANDLE_WIDTH, minWidth: DRAG_HANDLE_WIDTH }}
                    draggable
                    onDragStart={(e) => {
                      setDraggedCategory(category.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDraggedCategory(null)}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                    </svg>
                  </div>
                  
                  <div 
                    className="flex-shrink-0 p-2 border-r border-slate-200 bg-slate-50 flex items-center justify-between group"
                    style={{ width: CATEGORY_WIDTH, minWidth: CATEGORY_WIDTH }}
                  >
                    {editingCategory === category.id ? (
                      <input
                        autoFocus
                        value={category.name}
                        onChange={(e) => updateCategoryName(category.id, e.target.value)}
                        onBlur={() => setEditingCategory(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingCategory(null)}
                        className="flex-1 px-1 py-0.5 border rounded text-xs w-full"
                      />
                    ) : (
                      <>
                        <span
                          className="font-medium text-slate-800 cursor-pointer text-xs leading-tight"
                          onClick={(e) => { e.stopPropagation(); setEditingCategory(category.id); }}
                        >
                          {category.name}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCategory(category.id); }}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-sm ml-1"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div 
                    ref={catIndex === 0 ? gridContainerRef : null}
                    className="flex-1 relative"
                    style={{ minWidth: `${numWeeks * 80}px` }}
                    onDragOver={(e) => {
                      // Only accept task drops, not category reorder
                      if (!draggedCategory) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      // Ignore category drops
                      if (draggedCategory) return;
                      
                      const unscheduledTaskId = e.dataTransfer.getData('unscheduledTaskId');
                      const scheduledTaskId = e.dataTransfer.getData('scheduledTaskId');
                      const taskId = unscheduledTaskId || scheduledTaskId;
                      
                      if (taskId) {
                        // Calculate drop position
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const dayWidth = rect.width / totalDays;
                        const dropDay = Math.max(0, Math.min(totalDays - 1, Math.floor(x / dayWidth)));
                        
                        // Move task to this category (and schedule if unscheduled)
                        setTasks(prev => prev.map(t => 
                          t.id === taskId 
                            ? { ...t, categoryId: category.id, startDay: unscheduledTaskId ? dropDay : t.startDay }
                            : t
                        ));
                      }
                    }}
                  >
                    {/* Grid lines with day subdivisions */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {weeks.map((_, weekIdx) => (
                        <div key={weekIdx} className="flex border-r-2 border-slate-200" style={{ width: `${100 / numWeeks}%`, minWidth: '80px' }}>
                          {[0, 1, 2, 3, 4].map(dayIdx => (
                            <div 
                              key={dayIdx} 
                              className={`flex-1 ${dayIdx < 4 ? 'border-r border-slate-100' : ''}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    
                    {/* Tasks */}
                    {tasks
                      .filter(t => t.categoryId === category.id && t.startDay !== null && t.startDay !== undefined)
                      .map(task => {
                        const style = getTaskStyle(task);
                        const isSelected = selectedTask === task.id;
                        const isCreatingFrom = creatingDependency === task.id;
                        const isDragging = dragState?.taskId === task.id;
                        
                        return (
                          <div
                            key={task.id}
                            className={`absolute top-3 bottom-3 rounded-l flex items-center text-white font-medium shadow-md transition-shadow
                              ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''} 
                              ${isCreatingFrom ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                              ${isDragging ? 'opacity-80 shadow-lg' : ''}`}
                            style={{
                              ...style,
                              backgroundColor: task.color,
                              minWidth: '50px',
                              touchAction: 'none',
                              zIndex: isDragging ? 20 : 10
                            }}
                            onClick={(e) => handleTaskClick(e, task)}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('scheduledTaskId', task.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                          >
                            {/* Left resize handle */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none"
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-left')}
                              onTouchStart={(e) => handleDragStart(e, task, 'resize-left')}
                            >
                              <div className="w-1 h-8 bg-white bg-opacity-40 rounded" />
                            </div>
                            
                            {/* Drag area */}
                            <div 
                              className="flex-1 px-3 cursor-move touch-none text-center truncate leading-tight"
                              style={{ 
                                fontSize: getTaskFontSize(task)
                              }}
                              onMouseDown={(e) => handleDragStart(e, task, 'move')}
                              onTouchStart={(e) => handleDragStart(e, task, 'move')}
                            >
                              {task.name}
                            </div>
                            
                            {/* Right resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none"
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-right')}
                              onTouchStart={(e) => handleDragStart(e, task, 'resize-right')}
                            >
                              <div className="w-1 h-8 bg-white bg-opacity-40 rounded" />
                            </div>
                            
                            {/* Arrow point */}
                            <div
                              className="absolute -right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                              style={{
                                width: 0,
                                height: 0,
                                borderTop: '16px solid transparent',
                                borderBottom: '16px solid transparent',
                                borderLeft: `14px solid ${task.color}`
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

              {/* Dependency Arrows SVG Overlay */}
              <svg
                className="absolute top-0 pointer-events-none"
                style={{ 
                  left: DRAG_HANDLE_WIDTH + CATEGORY_WIDTH, 
                  width: `calc(100% - ${DRAG_HANDLE_WIDTH + CATEGORY_WIDTH}px)`,
                  minWidth: `${numWeeks * 80}px`,
                  height: categories.length * ROW_HEIGHT,
                  overflow: 'visible'
                }}
              >
                <g style={{ pointerEvents: 'auto' }}>
                  {renderDependencies()}
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Not Scheduled Section */}
        {tasks.filter(t => t.startDay === null || t.startDay === undefined).length > 0 && (
          <div className="mt-4 bg-white rounded-lg shadow p-4 print:hidden">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-amber-500">📋</span> Not Scheduled
              <span className="text-xs font-normal text-slate-500">
                (drag onto timeline to schedule)
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {tasks
                .filter(t => t.startDay === null || t.startDay === undefined)
                .map(task => {
                  const category = categories.find(c => c.id === task.categoryId);
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('unscheduledTaskId', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-move hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: task.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-800">{task.name}</div>
                        <div className="text-xs text-slate-500">{category?.name} • {task.assignee}</div>
                      </div>
                      <button
                        onClick={() => {
                          setTaskForm({
                            name: task.name,
                            categoryId: task.categoryId,
                            startDay: null,
                            durationDays: task.durationDays,
                            assignee: task.assignee
                          });
                          setEditingTaskId(task.id);
                          setShowTaskModal(true);
                        }}
                        className="text-slate-400 hover:text-blue-500 text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-400 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Selected Task Actions */}
        {selectedTask && (() => {
          const task = tasks.find(t => t.id === selectedTask);
          const taskDependencies = dependencies.filter(d => d.fromTaskId === selectedTask);
          const dependsOn = dependencies.filter(d => d.toTaskId === selectedTask);
          const hasDependencies = taskDependencies.length > 0 || dependsOn.length > 0;
          const isScheduled = task && task.startDay !== null && task.startDay !== undefined;
          
          return (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 z-50 border border-slate-200">
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={() => {
                    // Pre-populate form with task data
                    const isUnscheduled = task.startDay === null || task.startDay === undefined;
                    setTaskForm({
                      name: task.name,
                      categoryId: task.categoryId,
                      startDay: isUnscheduled ? null : task.startDay,
                      durationDays: task.durationDays,
                      assignee: task.assignee
                    });
                    setEditingTaskId(task.id);
                    setShowTaskModal(true);
                    setSelectedTask(null);
                  }}
                  className="bg-slate-600 text-white px-3 py-2 rounded hover:bg-slate-700 text-xs font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => startDependencyCreation(selectedTask)}
                  className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-xs font-medium"
                >
                  🔗 Link Sub Task
                </button>
                {isScheduled && (
                  <button
                    onClick={() => {
                      setTasks(prev => prev.map(t => 
                        t.id === selectedTask ? { ...t, startDay: null } : t
                      ));
                      // Remove dependencies when unscheduling
                      setDependencies(prev => prev.filter(d => d.fromTaskId !== selectedTask && d.toTaskId !== selectedTask));
                      setSelectedTask(null);
                    }}
                    className="bg-amber-600 text-white px-3 py-2 rounded hover:bg-amber-700 text-xs font-medium"
                  >
                    📋 Unschedule
                  </button>
                )}
                {hasDependencies && (
                  <button
                    onClick={() => {
                      setDependencies(prev => prev.filter(d => d.fromTaskId !== selectedTask && d.toTaskId !== selectedTask));
                      setSelectedTask(null);
                    }}
                    className="bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 text-xs font-medium"
                  >
                    ✂️ Remove Dependencies ({taskDependencies.length + dependsOn.length})
                  </button>
                )}
                <button
                  onClick={() => deleteTask(selectedTask)}
                  className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-xs font-medium"
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="bg-slate-400 text-white px-3 py-2 rounded hover:bg-slate-500 text-xs font-medium"
                >
                  ✕
                </button>
              </div>
              {hasDependencies && (
                <div className="mt-2 pt-2 border-t text-xs text-slate-600">
                  {taskDependencies.length > 0 && (
                    <div>Dependants: {taskDependencies.map(d => tasks.find(t => t.id === d.toTaskId)?.name).filter(Boolean).join(', ')}</div>
                  )}
                  {dependsOn.length > 0 && (
                    <div>Depends on: {dependsOn.map(d => tasks.find(t => t.id === d.fromTaskId)?.name).filter(Boolean).join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Add/Edit Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-3">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Task Name</label>
                  <input
                    type="text"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Enter task name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={taskForm.categoryId}
                    onChange={(e) => setTaskForm({ ...taskForm, categoryId: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned To</label>
                  <select
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select assignee</option>
                    {assignees.map(a => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Week</label>
                    <select
                      value={Math.floor((taskForm.startDay ?? 0) / DAYS_PER_WEEK)}
                      onChange={(e) => {
                        const weekIdx = parseInt(e.target.value);
                        const currentDayInWeek = (taskForm.startDay ?? 0) % DAYS_PER_WEEK;
                        setTaskForm({ ...taskForm, startDay: weekIdx * DAYS_PER_WEEK + currentDayInWeek });
                      }}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={taskForm.startDay === null || taskForm.startDay === undefined}
                    >
                      {weeks.map((date, idx) => (
                        <option key={idx} value={idx}>{formatWeekHeader(date)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Day</label>
                    <select
                      value={(taskForm.startDay ?? 0) % DAYS_PER_WEEK}
                      onChange={(e) => {
                        const dayInWeek = parseInt(e.target.value);
                        const weekIdx = Math.floor((taskForm.startDay ?? 0) / DAYS_PER_WEEK);
                        setTaskForm({ ...taskForm, startDay: weekIdx * DAYS_PER_WEEK + dayInWeek });
                      }}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={taskForm.startDay === null || taskForm.startDay === undefined}
                    >
                      <option value={0}>Monday</option>
                      <option value={1}>Tuesday</option>
                      <option value={2}>Wednesday</option>
                      <option value={3}>Thursday</option>
                      <option value={4}>Friday</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="unscheduled"
                    checked={taskForm.startDay === null || taskForm.startDay === undefined}
                    onChange={(e) => setTaskForm({ ...taskForm, startDay: e.target.checked ? null : 0 })}
                    className="rounded"
                  />
                  <label htmlFor="unscheduled" className="text-xs text-slate-700">Leave unscheduled</label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={taskForm.durationDays}
                    onChange={(e) => setTaskForm({ ...taskForm, durationDays: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded px-3 py-2 text-sm"
                    min="1"
                    max={totalDays}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTaskId(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-slate-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTaskId) {
                      // Update existing task
                      const assigneeData = assignees.find(a => a.name === taskForm.assignee);
                      setTasks(prev => prev.map(t => 
                        t.id === editingTaskId 
                          ? {
                              ...t,
                              name: taskForm.name,
                              categoryId: taskForm.categoryId,
                              startDay: taskForm.startDay,
                              durationDays: taskForm.durationDays,
                              assignee: taskForm.assignee,
                              color: assigneeData?.color || t.color
                            }
                          : t
                      ));
                      setEditingTaskId(null);
                      setShowTaskModal(false);
                    } else {
                      // Add new task
                      addTask();
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
                >
                  {editingTaskId ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-3">Import Tasks from CSV</h2>
              <p className="text-xs text-slate-600 mb-3">
                CSV headers: Category, Task Name, Assigned To, Start, Finish
              </p>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={importTasks}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm"
                >
                  Tap to select CSV file
                </label>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border rounded hover:bg-slate-100 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Assignee Modal */}
        {showAssigneeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-3">Add New Assignee</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assignee Name</label>
                  <input
                    type="text"
                    value={newAssigneeName}
                    onChange={(e) => setNewAssigneeName(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Enter name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newAssigneeColor}
                      onChange={(e) => setNewAssigneeColor(e.target.value)}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {['#2d5a3d', '#d4820e', '#4a7c59', '#1e3a5f', '#8b6914', '#7c3aed', '#dc2626', '#0891b2'].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewAssigneeColor(color)}
                          className={`w-6 h-6 rounded ${newAssigneeColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => { setShowAssigneeModal(false); setNewAssigneeName(''); }}
                  className="px-4 py-2 border rounded hover:bg-slate-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addAssignee}
                  disabled={!newAssigneeName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm disabled:opacity-50"
                >
                  Add Assignee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-screen overflow-hidden flex flex-col">
              <h2 className="text-lg font-bold mb-3">Export Task List</h2>
              <p className="text-xs text-slate-600 mb-2">Copy the CSV data below:</p>
              <textarea
                readOnly
                value={exportData}
                className="w-full border rounded px-3 py-2 text-xs font-mono bg-slate-50 flex-1 min-h-48 resize-none"
                onClick={(e) => e.target.select()}
              />
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(exportData);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border rounded hover:bg-slate-100 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Preview Modal */}
        {showPrintPreview && (
          <div className="fixed inset-0 bg-white z-50 overflow-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-lg font-bold">Print Preview</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const printContent = document.getElementById('print-area');
                      const iframe = document.createElement('iframe');
                      iframe.style.position = 'absolute';
                      iframe.style.top = '-10000px';
                      iframe.style.left = '-10000px';
                      document.body.appendChild(iframe);
                      
                      const doc = iframe.contentDocument || iframe.contentWindow.document;
                      doc.open();
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
                              @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                th { background: #374151 !important; color: white !important; }
                                .task-bar { color: white !important; }
                              }
                            </style>
                          </head>
                          <body>${printContent.innerHTML}</body>
                        </html>
                      `);
                      doc.close();
                      
                      iframe.contentWindow.focus();
                      setTimeout(() => {
                        iframe.contentWindow.print();
                        setTimeout(() => {
                          document.body.removeChild(iframe);
                        }, 1000);
                      }, 250);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="px-4 py-2 border rounded hover:bg-slate-100 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
              
              <div id="print-area" className="bg-white">
                <h1 className="text-xl font-bold mb-4 text-center">Project Plan</h1>
                <p className="text-sm text-slate-600 mb-4 text-center">
                  Start: {startDate.toLocaleDateString()} | {numWeeks} weeks
                </p>
                
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-slate-700 text-white p-2 w-32">Category</th>
                      {weeks.map((date, idx) => (
                        <th key={idx} className="border border-slate-300 bg-slate-700 text-white p-1 text-center" style={{minWidth: '50px'}}>
                          {formatWeekHeader(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <tr key={category.id}>
                        <td className="border border-slate-300 p-2 font-medium bg-slate-50">{category.name}</td>
                        {weeks.map((_, weekIdx) => {
                          const weekStartDay = weekIdx * DAYS_PER_WEEK;
                          const weekEndDay = weekStartDay + DAYS_PER_WEEK;
                          const tasksInCell = tasks.filter(t => 
                            t.categoryId === category.id && 
                            t.startDay !== null && 
                            t.startDay !== undefined &&
                            t.startDay >= weekStartDay && 
                            t.startDay < weekEndDay
                          );
                          const continuingTasks = tasks.filter(t =>
                            t.categoryId === category.id &&
                            t.startDay !== null && 
                            t.startDay !== undefined &&
                            t.startDay < weekStartDay &&
                            t.startDay + t.durationDays > weekStartDay
                          );
                          return (
                            <td key={weekIdx} className="border border-slate-300 p-1 relative" style={{height: '50px', verticalAlign: 'middle'}}>
                              {tasksInCell.map(task => {
                                const charsPerDay = 1.5;
                                const availableSpace = task.durationDays * charsPerDay;
                                const textLength = task.name.length;
                                let fontSize = '11px';
                                if (textLength > availableSpace * 1.5) fontSize = '7px';
                                else if (textLength > availableSpace) fontSize = '8px';
                                else if (textLength > availableSpace * 0.75) fontSize = '9px';
                                else if (textLength > availableSpace * 0.5) fontSize = '10px';
                                
                                const dayOffsetInWeek = task.startDay - weekStartDay;
                                const durationWeeks = task.durationDays / DAYS_PER_WEEK;
                                
                                return (
                                  <div
                                    key={task.id}
                                    className="task-bar px-1"
                                    style={{
                                      backgroundColor: task.color,
                                      color: '#ffffff',
                                      position: 'absolute',
                                      left: `calc(${dayOffsetInWeek * 20}% + 2px)`,
                                      top: '4px',
                                      bottom: '4px',
                                      width: `calc(${durationWeeks * 100}% - 4px)`,
                                      zIndex: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      textAlign: 'center',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      fontSize,
                                      borderRadius: '3px',
                                      WebkitPrintColorAdjust: 'exact',
                                      printColorAdjust: 'exact'
                                    }}
                                  >
                                    {task.name}
                                  </div>
                                );
                              })}
                              {continuingTasks.length > 0 && tasksInCell.length === 0 && (
                                <div className="w-full h-6 bg-slate-200 rounded opacity-30" />
                              )}
                            </td>
                          );
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
                        const category = categories.find(c => c.id === task.categoryId);
                        const weekIndex = Math.floor(task.startDay / DAYS_PER_WEEK);
                        const dayInWeek = task.startDay % DAYS_PER_WEEK;
                        const taskStartDate = new Date(weeks[weekIndex] || weeks[0]);
                        taskStartDate.setDate(taskStartDate.getDate() + dayInWeek);
                        return (
                          <tr key={task.id}>
                            <td className="border border-slate-300 p-2">{task.name}</td>
                            <td className="border border-slate-300 p-2">{category?.name}</td>
                            <td className="border border-slate-300 p-2">
                              <span className="inline-block w-2 h-2 rounded mr-1" style={{backgroundColor: task.color}} />
                              {task.assignee}
                            </td>
                            <td className="border border-slate-300 p-2">{taskStartDate?.toLocaleDateString()}</td>
                            <td className="border border-slate-300 p-2">{task.durationDays} day{task.durationDays > 1 ? 's' : ''}</td>
                          </tr>
                        );
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-3 bg-white rounded-lg shadow p-3 text-xs text-slate-600 print:hidden">
          <h3 className="font-bold text-slate-800 mb-2">How to use:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div>• <strong>Drag tasks</strong> to move them (snaps to days M-F)</div>
            <div>• <strong>Drag edges</strong> to resize duration by day</div>
            <div>• <strong>Tap task</strong> to select, then add dependency, unschedule, or delete</div>
            <div>• <strong>Red arrows</strong> show dependencies (tap to delete)</div>
            <div>• <strong>Not Scheduled</strong> - drag tasks onto timeline to schedule</div>
            <div>• <strong>Export</strong> saves CSV with updated dates</div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ProjectPlanner;
