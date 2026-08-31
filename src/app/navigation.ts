import type { NavigationItem } from '../types/analysis'

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    description: 'System overview and summary metrics',
    path: '/',
  },
  {
    label: 'New Analysis',
    description: 'Prepare a new microscopy analysis workflow',
    path: '/new-analysis',
  },
  {
    label: 'Analysis History',
    description: 'Review previous analysis records',
    path: '/analysis-history',
  },
  {
    label: 'Settings',
    description: 'Configure future system preferences',
    path: '/settings',
  },
]

export const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Operational overview for SpermVision',
  },
  '/new-analysis': {
    title: 'New Analysis',
    subtitle: 'Mobile-ready analysis workspace for future AI inference',
  },
  '/analysis-history': {
    title: 'Analysis History',
    subtitle: 'Responsive review of past analysis sessions',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Frontend-ready configuration surface',
  },
}