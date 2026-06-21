import { User, Shield, TestTube, Sparkles, Code2, Swords, Building2, Gauge, Eye, Monitor } from 'lucide-react'

export const REVIEWER_ICONS: Record<string, typeof User> = {
  principal: Sparkles,
  quality: User,
  security: Shield,
  testing: TestTube,
  architect: Building2,
  architecture: Building2,
  coder: Code2,
  devil_advocate: Swords,
  performance: Gauge,
  reviewer: Eye,
  frontend: Monitor,
}
