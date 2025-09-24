import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { ProcessedDataset, TrainingResults, ScenarioResults, ReportData } from '../types/dataScience';

export type WorkflowStep = 
  | 'data-input' 
  | 'model-config' 
  | 'analytics' 
  | 'reports' 
  | 'scenario' 
  | 'risk-assessment';

export interface WorkflowProgress {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  availableSteps: WorkflowStep[];
  canNavigateToStep: (step: WorkflowStep) => boolean;
}

export interface WorkflowData {
  dataset?: ProcessedDataset;
  trainingResults?: TrainingResults;
  analyticsData?: any;
  reportData?: ReportData;
  scenarioResults?: ScenarioResults[];
}

export interface WorkflowNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface WorkflowState {
  // Progress tracking
  progress: WorkflowProgress;
  
  // Data persistence
  data: WorkflowData;
  
  // Loading states
  loadingStates: Record<string, boolean>;
  
  // Error handling
  errors: Record<string, string | null>;
  
  // Notifications
  notifications: WorkflowNotification[];
  
  // Performance optimization
  cache: Record<string, any>;
  lastCacheUpdate: Record<string, Date>;
  
  // Actions
  setCurrentStep: (step: WorkflowStep) => void;
  completeStep: (step: WorkflowStep) => void;
  setStepData: (step: WorkflowStep, data: any) => void;
  
  // Navigation guards
  canNavigateToStep: (step: WorkflowStep) => boolean;
  getNextAvailableStep: () => WorkflowStep | null;
  getPreviousStep: () => WorkflowStep | null;
  
  // Loading management
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  
  // Error management
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  
  // Notification management
  addNotification: (notification: Omit<WorkflowNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Cache management
  setCache: (key: string, data: any) => void;
  getCache: (key: string) => any;
  clearCache: (key?: string) => void;
  isCacheValid: (key: string, maxAge?: number) => boolean;
  
  // Reset workflow
  resetWorkflow: () => void;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  'data-input',
  'model-config', 
  'analytics',
  'reports',
  'scenario',
  'risk-assessment'
];

const STEP_DEPENDENCIES: Record<WorkflowStep, WorkflowStep[]> = {
  'data-input': [],
  'model-config': ['data-input'],
  'analytics': ['model-config'],
  'reports': ['analytics'],
  'scenario': ['analytics'],
  'risk-assessment': ['analytics']
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial state
      progress: {
        currentStep: 'data-input',
        completedSteps: [],
        availableSteps: ['data-input'],
        canNavigateToStep: (step: WorkflowStep) => get().canNavigateToStep(step)
      },
      
      data: {},
      loadingStates: {},
      errors: {},
      notifications: [],
      cache: {},
      lastCacheUpdate: {},
      
      // Actions
      setCurrentStep: (step: WorkflowStep) => {
        const state = get();
        if (state.canNavigateToStep(step)) {
          set(state => ({
            progress: {
              ...state.progress,
              currentStep: step
            }
          }));
        }
      },
      
      completeStep: (step: WorkflowStep) => {
        set(state => {
          const completedSteps = [...state.progress.completedSteps];
          if (!completedSteps.includes(step)) {
            completedSteps.push(step);
          }
          
          // Calculate available steps based on dependencies
          const availableSteps = WORKFLOW_STEPS.filter(workflowStep => {
            const dependencies = STEP_DEPENDENCIES[workflowStep];
            return dependencies.every(dep => completedSteps.includes(dep));
          });
          
          return {
            progress: {
              ...state.progress,
              completedSteps,
              availableSteps
            }
          };
        });
      },
      
      setStepData: (step: WorkflowStep, data: any) => {
        set(state => ({
          data: {
            ...state.data,
            [step]: data
          }
        }));
      },
      
      // Navigation guards
      canNavigateToStep: (step: WorkflowStep) => {
        const state = get();
        const dependencies = STEP_DEPENDENCIES[step];
        return dependencies.every(dep => state.progress.completedSteps.includes(dep));
      },
      
      getNextAvailableStep: () => {
        const state = get();
        const currentIndex = WORKFLOW_STEPS.indexOf(state.progress.currentStep);
        
        for (let i = currentIndex + 1; i < WORKFLOW_STEPS.length; i++) {
          const step = WORKFLOW_STEPS[i];
          if (state.progress.availableSteps.includes(step)) {
            return step;
          }
        }
        
        return null;
      },
      
      getPreviousStep: () => {
        const state = get();
        const currentIndex = WORKFLOW_STEPS.indexOf(state.progress.currentStep);
        
        for (let i = currentIndex - 1; i >= 0; i--) {
          const step = WORKFLOW_STEPS[i];
          if (state.progress.availableSteps.includes(step)) {
            return step;
          }
        }
        
        return null;
      },
      
      // Loading management
      setLoading: (key: string, loading: boolean) => {
        set(state => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading
          }
        }));
      },
      
      isLoading: (key: string) => {
        return get().loadingStates[key] || false;
      },
      
      // Error management
      setError: (key: string, error: string | null) => {
        set(state => ({
          errors: {
            ...state.errors,
            [key]: error
          }
        }));
      },
      
      clearError: (key: string) => {
        set(state => ({
          errors: {
            ...state.errors,
            [key]: null
          }
        }));
      },
      
      clearAllErrors: () => {
        set({ errors: {} });
      },
      
      // Notification management
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random()}`;
        const newNotification: WorkflowNotification = {
          ...notification,
          id,
          timestamp: new Date()
        };
        
        set(state => ({
          notifications: [...state.notifications, newNotification]
        }));
        
        // Auto-remove notification after duration
        if (notification.duration) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }
      },
      
      removeNotification: (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      
      clearNotifications: () => {
        set({ notifications: [] });
      },
      
      // Cache management
      setCache: (key: string, data: any) => {
        set(state => ({
          cache: {
            ...state.cache,
            [key]: data
          },
          lastCacheUpdate: {
            ...state.lastCacheUpdate,
            [key]: new Date()
          }
        }));
      },
      
      getCache: (key: string) => {
        return get().cache[key];
      },
      
      clearCache: (key?: string) => {
        if (key) {
          set(state => {
            const { [key]: removed, ...cache } = state.cache;
            const { [key]: removedUpdate, ...lastCacheUpdate } = state.lastCacheUpdate;
            return { cache, lastCacheUpdate };
          });
        } else {
          set({ cache: {}, lastCacheUpdate: {} });
        }
      },
      
      isCacheValid: (key: string, maxAge: number = 300000) => { // 5 minutes default
        const state = get();
        const lastUpdate = state.lastCacheUpdate[key];
        if (!lastUpdate) return false;
        
        return Date.now() - lastUpdate.getTime() < maxAge;
      },
      
      // Reset workflow
      resetWorkflow: () => {
        set({
          progress: {
            currentStep: 'data-input',
            completedSteps: [],
            availableSteps: ['data-input'],
            canNavigateToStep: (step: WorkflowStep) => get().canNavigateToStep(step)
          },
          data: {},
          loadingStates: {},
          errors: {},
          notifications: [],
          cache: {},
          lastCacheUpdate: {}
        });
      }
    })),
    {
      name: 'prism-workflow',
      partialize: (state) => ({
        progress: state.progress,
        data: state.data,
        cache: state.cache,
        lastCacheUpdate: state.lastCacheUpdate
      })
    }
  )
);