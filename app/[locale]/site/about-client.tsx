'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Award, Zap, Globe2, Target, Users, Code2, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function AboutClient({ primaryColor, siteTitle }: { primaryColor: string, siteTitle: string }) {
  const t = useTranslations('Storefront')
  const [activeTab, setActiveTab] = useState<'mission' | 'vision' | 'values'>('mission')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const stats = [
    { label: 'DagangOS platform', value: '1', icon: Globe2 },
    { label: t('stat_modules'), value: '15', icon: Code2 },
    { label: 'Tenant-ready architecture', value: 'Secure', icon: Zap },
    { label: 'Project launch flow', value: 'Built', icon: TrendingUp },
  ]

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* Animated Hero */}
      <section className="relative overflow-hidden py-24 md:py-32 bg-slate-950 text-white">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 70% 30%, ${primaryColor}, transparent 60%)` }}
        />
        <div className={`max-w-4xl mx-auto px-6 text-center relative z-10 transition-all duration-1000 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border text-slate-200 mb-6"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
            {t('about_title')} {siteTitle}
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            {t('about_hero1')} <br />
            <span style={{ color: primaryColor }}>{t('about_hero2')}</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('about_subtitle')}
          </p>
        </div>
      </section>

      {/* Interactive Mission Tabs */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <div className="bg-white rounded-3xl p-2 shadow-xl border border-slate-100 mb-12 flex flex-wrap md:flex-nowrap justify-between gap-2">
          {['mission', 'vision', 'values'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm transition-all capitalize ${
                activeTab === tab ? 'text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              }`}
              style={activeTab === tab ? { backgroundColor: primaryColor } : {}}
            >
              {tab === 'mission' ? t('tab_mission') : tab === 'vision' ? t('tab_vision') : t('tab_values')}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-10 md:p-16 border border-slate-100 shadow-sm min-h-[300px] flex items-center transition-all">
          {activeTab === 'mission' && (
            <div className="animate-fade-in flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                  <Target className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('mission_title')}</h2>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {t('mission_text')}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'vision' && (
            <div className="animate-fade-in flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                  <Globe2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('vision_title')}</h2>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {t('vision_text')}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'values' && (
            <div className="animate-fade-in flex flex-col md:flex-row gap-12 items-center w-full">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">{t('values_title')}</h2>
                <ul className="space-y-4">
                  {[
                    t('val_1'),
                    t('val_2'),
                    t('val_3'),
                    t('val_4')
                  ].map((val, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="w-5 h-5" style={{ color: primaryColor }} />
                      <span className="font-medium text-lg">{val}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section with dynamic icons */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-8 h-8" style={{ color: primaryColor }} />
                </div>
                <p className="text-4xl font-extrabold mb-2">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
