"use client"
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
type FileData = {
  id: string
  task_id: string
  file_name: string
  content_type: string | null
  path: string
  file_category: string
  created_at: string
}
type FileCacheData = {
  [taskId: string]: {
    files: FileData[]
    count: number
    hasFiles: boolean
    lastUpdated: number
  }
}
// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000
class FileCache {
  private cache: FileCacheData = {}
  private pendingQueries = new Set<string>()
  // Get cached data for a task
  getCachedFiles(taskId: string) {
    const cached = this.cache[taskId]
    if (!cached) return null
    // Check if cache is still valid
    if (Date.now() - cached.lastUpdated > CACHE_DURATION) {
      delete this.cache[taskId]
      return null
    }
    return cached
  }
  // Set cached data for a task
  setCachedFiles(taskId: string, files: FileData[]) {
    this.cache[taskId] = {
      files,
      count: files.length,
      hasFiles: files.length > 0,
      lastUpdated: Date.now()
    }
  }
  // Check if query is pending for a task
  isPending(taskId: string) {
    return this.pendingQueries.has(taskId)
  }
  // Mark query as pending
  setPending(taskId: string) {
    this.pendingQueries.add(taskId)
  }
  // Remove pending status
  removePending(taskId: string) {
    this.pendingQueries.delete(taskId)
  }
  // Invalidate cache for a specific task
  invalidate(taskId: string) {
    delete this.cache[taskId]
    this.pendingQueries.delete(taskId)
  }
  // Batch load files for multiple tasks
  async batchLoadFiles(taskIds: string[], fileCategory: string = 'entregavel') {
    if (taskIds.length === 0) return
    // Filter out tasks that are already cached, pending, or temporary (not saved to DB yet)
    const uncachedTasks = taskIds.filter(taskId => 
      !this.getCachedFiles(taskId) && 
      !this.isPending(taskId) &&
      !taskId.startsWith('temp-') // Skip temporary IDs that haven't been saved to DB
    )
    if (uncachedTasks.length === 0) {
      // Set empty cache for temporary tasks to prevent repeated queries
      taskIds.forEach(taskId => {
        if (taskId.startsWith('temp-') && !this.getCachedFiles(taskId)) {
          this.setCachedFiles(taskId, [])
        }
      })
      return
    }
    // Limit batch size to prevent URL length issues
    const BATCH_SIZE = 50
    const batches = []
    for (let i = 0; i < uncachedTasks.length; i += BATCH_SIZE) {
      batches.push(uncachedTasks.slice(i, i + BATCH_SIZE))
    }
    // Process batches sequentially
    for (const batch of batches) {
      // Mark batch as pending
      batch.forEach(taskId => this.setPending(taskId))
      try {
        const supabase = await getSupabaseClient()
        // Query for this batch
        const { data, error } = await supabase
          .from('task_files')
          .select('*')
          .in('task_id', batch)
          .eq('file_category', fileCategory)
          .order('created_at', { ascending: false })
        if (error) throw error
        // Group files by task_id
        const filesByTask: { [taskId: string]: FileData[] } = {}
        batch.forEach(taskId => {
          filesByTask[taskId] = []
        })
        ;(data || []).forEach(file => {
          if (filesByTask[file.task_id]) {
            filesByTask[file.task_id].push(file)
          }
        })
        // Cache the results
        Object.entries(filesByTask).forEach(([taskId, files]) => {
          this.setCachedFiles(taskId, files)
        })
      } catch (error) {
        // Set empty cache for failed queries to avoid repeated failures
        batch.forEach(taskId => {
          this.setCachedFiles(taskId, [])
        })
      } finally {
        // Remove pending status
        batch.forEach(taskId => this.removePending(taskId))
      }
    }
  }
}
// Global cache instance
const fileCache = new FileCache()
export function useFileCache() {
  const [, setRefresh] = useState(0)
  // Force re-render when cache updates
  const forceUpdate = useCallback(() => {
    setRefresh(prev => prev + 1)
  }, [])
  // Get files for a specific task
  const getTaskFiles = useCallback((taskId: string, fileCategory: string = 'entregavel') => {
    const cached = fileCache.getCachedFiles(taskId)
    if (cached) {
      return {
        files: cached.files.filter(f => f.file_category === fileCategory),
        count: cached.files.filter(f => f.file_category === fileCategory).length,
        hasFiles: cached.files.filter(f => f.file_category === fileCategory).length > 0,
        loading: false
      }
    }
    return {
      files: [],
      count: 0,
      hasFiles: false,
      loading: fileCache.isPending(taskId)
    }
  }, [])
  // Preload files for multiple tasks (batch operation)
  const preloadFiles = useCallback(async (taskIds: string[], fileCategory: string = 'entregavel') => {
    await fileCache.batchLoadFiles(taskIds, fileCategory)
    forceUpdate()
  }, [forceUpdate])
  // Load files for a single task (fallback)
  const loadTaskFiles = useCallback(async (taskId: string, fileCategory: string = 'entregavel') => {
    await fileCache.batchLoadFiles([taskId], fileCategory)
    forceUpdate()
  }, [forceUpdate])
  // Invalidate cache for a task (e.g., after upload/delete)
  const invalidateTask = useCallback((taskId: string) => {
    fileCache.invalidate(taskId)
    forceUpdate()
  }, [forceUpdate])
  // Refresh files for a task
  const refreshTaskFiles = useCallback(async (taskId: string, fileCategory: string = 'entregavel') => {
    fileCache.invalidate(taskId)
    await fileCache.batchLoadFiles([taskId], fileCategory)
    forceUpdate()
  }, [forceUpdate])
  return {
    getTaskFiles,
    preloadFiles,
    loadTaskFiles,
    invalidateTask,
    refreshTaskFiles
  }
}