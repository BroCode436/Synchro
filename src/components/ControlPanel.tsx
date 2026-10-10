import React, { useState, useRef } from 'react';
import { VisualSettings, PresetType, LogoBlendMode, CustomColorPalette } from '../types/visual';
import { COLOR_PALETTES } from '../visuals/palettes';
import {
  Sliders, Palette, Layers, Sparkles, Eye, Shield, Tv, Image, Upload, RotateCcw,
  Pipette, SunDim, Bookmark, Trash2, Check, Plus, FolderHeart
} from 'lucide-react';
import {
  loadSavedPresets,
  saveUserPreset,
  deleteUserPreset,
  loadRecentLogos,
  saveRecentLogo,
  deleteRecentLogo,
  SavedPreset,
  StoredLogo
} from '../utils/storage';

interface ControlPanelProps {
  settings: VisualSettings;
  onUpdateSettings: (updater: (prev: VisualSettings) => VisualSettings) => void;
  onToggleBigScreen?: () => void;
  onClose: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onUpdateSettings,
  onToggleBigScreen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'visuals' | 'colors' | 'systems' | 'backdrop'>('visuals');
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => loadSavedPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [recentLogos, setRecentLogos] = useState<StoredLogo[]>(() => loadRecentLogos());
  const logoUploadRef = useRef<HTMLInputElement | null>(null);

  const presets: { id: PresetType; name: string; desc: string }[] = [
    { id: 'cymatics', name: 'Sacred Cymatics', desc: '6-fold harmonic radial mandala & cymatic nodal rings' },
    { id: 'celestial', name: 'Celestial Spiral', desc: 'Extravagant gossamer orbital ribbons & delicate tendrils' },
    { id: 'kaleidoscope', name: 'Kaleidoscope Neon', desc: '8-fold crystal symmetry with diamond shockbursts' },
    { id: 'sketch', name: 'Sacred Sketch', desc: 'Ethereal fine-line luminous geometric drawing' },
    { id: 'minimal', name: 'Minimal Zen', desc: 'Subtle bilateral mirror resonance with deep breathing space' }
  ];

  const handlePresetSelect = (preset: PresetType) => {
    onUpdateSettings(prev => ({
      ...prev,
      preset,
      symmetryFolds: preset === 'kaleidoscope' ? 8 : (preset === 'minimal' ? 2 : 6),
      symmetryMode: preset === 'minimal' ? 'bilateral' : 'radial',
      intensity: preset === 'minimal' ? 0.65 : (preset === 'sketch' ? 0.85 : 1.05),
      postProcessing: {
        ...prev.postProcessing,
        trailPersistence: preset === 'celestial' ? 0.91 : (preset === 'sketch' ? 0.72 : 0.88)
      }
    }));
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const logoName = file.name.replace(/\.[^/.]+$/, "");
          const updated = saveRecentLogo(logoName, dataUrl);
          setRecentLogos(updated);
          onUpdateSettings(prev => ({
            ...prev,
            logo: {
              ...prev.logo,
              enabled: true,
              customUrl: dataUrl
            }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectRecentLogo = (dataUrl: string | null) => {
    onUpdateSettings(prev => ({
      ...prev,
      logo: {
        ...prev.logo,
        enabled: true,
        customUrl: dataUrl
      }
    }));
  };

  const handleDeleteRecentLogo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteRecentLogo(id);
    setRecentLogos(updated);
  };

  const resetToAiLogo = () => {
    onUpdateSettings(prev => ({
      ...prev,
      logo: {
        ...prev.logo,
        enabled: true,
        customUrl: null
      }
    }));
  };

  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim()) return;
    const updated = saveUserPreset(newPresetName.trim(), settings);
    setSavedPresets(updated);
    setNewPresetName('');
  };

  const handleLoadUserPreset = (preset: SavedPreset) => {
    onUpdateSettings(() => ({ ...preset.settings }));
  };

  const handleDeleteUserPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUserPreset(id);
    setSavedPresets(updated);
  };


  return (
    <div className="fixed top-16 right-6 z-20 w-88 bg-[#06080e]/92 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 text-white font-mono select-none max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold tracking-wider uppercase text-white/90">
            Instrument Controls
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 my-3 p-1 rounded-lg bg-white/5 border border-white/5 text-[10px]">
        <button
          onClick={() => setActiveTab('visuals')}
          className={`py-1 rounded font-medium transition-all ${
            activeTab === 'visuals' ? 'bg-purple-600/30 text-purple-300 shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          Visuals
        </button>
        <button
          onClick={() => setActiveTab('colors')}
          className={`py-1 rounded font-medium transition-all ${
            activeTab === 'colors' ? 'bg-purple-600/30 text-purple-300 shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          Colors
        </button>
        <button
          onClick={() => setActiveTab('systems')}
          className={`py-1 rounded font-medium transition-all ${
            activeTab === 'systems' ? 'bg-purple-600/30 text-purple-300 shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          Engines
        </button>
        <button
          onClick={() => setActiveTab('backdrop')}
          className={`py-1 rounded font-medium transition-all ${
            activeTab === 'backdrop' ? 'bg-purple-600/30 text-purple-300 shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          Backdrop
        </button>
      </div>

      {/* TAB 1: VISUALS & PRESETS */}
      {activeTab === 'visuals' && (
        <div className="space-y-4">
          {/* Sliders: Sensitivity & Intensity */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">Audio Sensitivity</span>
                <span className="text-cyan-300 font-bold">{settings.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={settings.sensitivity}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings(prev => ({ ...prev, sensitivity: val }));
                }}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">Visual Intensity / Density</span>
                <span className="text-purple-300 font-bold">{settings.intensity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={settings.intensity}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings(prev => ({ ...prev, intensity: val }));
                }}
                className="w-full accent-purple-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Symmetrical Geometry Controls */}
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-2.5">
            <div className="flex justify-between items-center text-[10px] text-white/50 tracking-wider">
              <span>CYMATIC SYMMETRY & FORM</span>
              <span className="text-cyan-300 font-bold">{settings.symmetryFolds}-Fold</span>
            </div>

            {/* Symmetry Mode: Radial vs Bilateral */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => onUpdateSettings(prev => ({ ...prev, symmetryMode: 'radial' }))}
                className={`py-1.5 px-2 rounded border text-center transition-all ${
                  settings.symmetryMode === 'radial'
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                    : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
                }`}
              >
                Radial Mandala
              </button>
              <button
                onClick={() => onUpdateSettings(prev => ({ ...prev, symmetryMode: 'bilateral' }))}
                className={`py-1.5 px-2 rounded border text-center transition-all ${
                  settings.symmetryMode === 'bilateral'
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                    : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
                }`}
              >
                Bilateral Mirror
              </button>
            </div>

            {/* Symmetry Fold Selector */}
            <div className="grid grid-cols-5 gap-1 text-[11px]">
              {[2, 4, 6, 8, 12].map(fold => (
                <button
                  key={fold}
                  onClick={() => onUpdateSettings(prev => ({ ...prev, symmetryFolds: fold }))}
                  className={`py-1 rounded border text-center font-mono font-semibold transition-all ${
                    settings.symmetryFolds === fold
                      ? 'bg-purple-500/30 border-purple-400/60 text-purple-200'
                      : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {fold}x
                </button>
              ))}
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <span className="text-[10px] text-white/50 tracking-wider block mb-2">VISUAL PRESETS</span>
            <div className="grid grid-cols-1 gap-1.5">
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs ${
                    settings.preset === p.id
                      ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/15'
                  }`}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-[10px] text-white/40 mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Saved Stage Presets Section */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50 tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3 h-3 text-cyan-400" />
                SAVED STAGE LOOKS
              </span>
              <span className="text-[9px] text-white/40">{savedPresets.length} saved</span>
            </div>

            {/* Save Current Look Input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Name current look..."
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveCurrentPreset(); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
              />
              <button
                onClick={handleSaveCurrentPreset}
                disabled={!newPresetName.trim()}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>

            {/* Saved Presets List */}
            {savedPresets.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                {savedPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 text-xs group transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="block font-semibold truncate text-white/90">{preset.name}</span>
                      <span className="text-[9px] text-white/40 block">
                        {new Date(preset.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {preset.settings.preset}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLoadUserPreset(preset)}
                        className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[10px] font-bold border border-cyan-400/30 transition-all"
                      >
                        Load
                      </button>
                      <button
                        onClick={e => handleDeleteUserPreset(preset.id, e)}
                        className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NEON PALETTES & CUSTOM COLOR CUSTOMIZER */}
      {activeTab === 'colors' && (
        <div className="space-y-4">
          {/* Palette Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/50 tracking-wider">NEON COLOR PALETTE</span>
              {settings.paletteId === 'custom' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Custom Mode Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {COLOR_PALETTES.map(pal => (
                <button
                  key={pal.id}
                  onClick={() => onUpdateSettings(prev => ({ ...prev, paletteId: pal.id }))}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    settings.paletteId === pal.id
                      ? 'bg-white/15 border-white/40 shadow-md ring-1 ring-white/30'
                      : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ backgroundColor: pal.colors.melodic }}
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ backgroundColor: pal.colors.percussion }}
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ backgroundColor: pal.colors.bass }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold block text-white/90 truncate">
                    {pal.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Bespoke Custom Color Customizer */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Pipette className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Create Custom Palette</span>
                </div>
                <button
                  onClick={() => {
                    const currentPal = COLOR_PALETTES.find(p => p.id === settings.paletteId) || COLOR_PALETTES[0];
                    onUpdateSettings(prev => ({
                      ...prev,
                      paletteId: 'custom',
                      customColors: {
                        melodic: prev.customColors?.melodic || currentPal.colors.melodic,
                        harmonic: prev.customColors?.harmonic || currentPal.colors.harmonic,
                        bass: prev.customColors?.bass || currentPal.colors.bass,
                        percussion: prev.customColors?.percussion || currentPal.colors.percussion,
                        accent: prev.customColors?.accent || currentPal.colors.accent
                      }
                    }));
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                    settings.paletteId === 'custom'
                      ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                      : 'bg-white/5 border-white/15 text-white/70 hover:text-white'
                  }`}
                >
                  {settings.paletteId === 'custom' ? 'Active' : 'Apply Custom'}
                </button>
              </div>

              {/* 5 Individual Color Channels */}
              <div className="space-y-1.5 pt-1">
                {[
                  { key: 'melodic' as const, label: 'Melody & Ribbons', def: '#00ffcc' },
                  { key: 'harmonic' as const, label: 'Harmony & Wireframes', def: '#38bdf8' },
                  { key: 'bass' as const, label: 'Bass & Standing Nodes', def: '#a855f7' },
                  { key: 'percussion' as const, label: 'Percussion & Shocks', def: '#ff6b35' },
                  { key: 'accent' as const, label: 'Peak Needles & Accent', def: '#ffffff' }
                ].map(channel => {
                  const val = settings.customColors?.[channel.key] || channel.def;
                  return (
                    <div key={channel.key} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-black/30 border border-white/5">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={val}
                          onChange={e => {
                            const newColor = e.target.value;
                            onUpdateSettings(prev => ({
                              ...prev,
                              paletteId: 'custom',
                              customColors: {
                                melodic: prev.customColors?.melodic || '#00ffcc',
                                harmonic: prev.customColors?.harmonic || '#38bdf8',
                                bass: prev.customColors?.bass || '#a855f7',
                                percussion: prev.customColors?.percussion || '#ff6b35',
                                accent: prev.customColors?.accent || '#ffffff',
                                [channel.key]: newColor
                              }
                            }));
                          }}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-white/80">{channel.label}</span>
                      </div>
                      <span className="font-mono text-[10px] text-white/40 uppercase">{val}</span>
                    </div>
                  );
                })}
              </div>

              {/* Quick Starter Themes for Custom Palette */}
              <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-white/40 block w-full">Quick Custom Starters:</span>
                {[
                  { name: 'Neon Acid', m: '#00ff88', h: '#00e5ff', b: '#9d00ff', p: '#ff0055' },
                  { name: 'Solar Amber', m: '#ffb703', h: '#fb8500', b: '#7209b7', p: '#f72585' },
                  { name: 'Royal Ice', m: '#e0fbfc', h: '#90e0ef', b: '#03045e', p: '#0077b6' },
                  { name: 'Blood Ruby', m: '#ff0054', h: '#9e0059', b: '#390040', p: '#ff5400' }
                ].map(starter => (
                  <button
                    key={starter.name}
                    onClick={() => {
                      onUpdateSettings(prev => ({
                        ...prev,
                        paletteId: 'custom',
                        customColors: {
                          melodic: starter.m,
                          harmonic: starter.h,
                          bass: starter.b,
                          percussion: starter.p,
                          accent: '#ffffff'
                        }
                      }));
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-white/70 border border-white/5 transition-all"
                  >
                    {starter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INDIVIDUAL VISUAL SYSTEMS */}
      {activeTab === 'systems' && (
        <div className="space-y-4">
          <span className="text-[10px] text-white/50 tracking-wider block">
            VISUAL SUBSYSTEM TOGGLES
          </span>

          <div className="space-y-2">
            {/* System A: Melodic Ribbons */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-xs font-semibold">Melodic Ribbons</span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Curves & trails responding to pitch & melody
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.activeSystems.melodic}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    activeSystems: { ...prev.activeSystems, melodic: checked }
                  }));
                }}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            {/* System B: Percussion Impacts */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold">Percussion Impacts</span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Expanding shock rings and needle bursts
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.activeSystems.percussion}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    activeSystems: { ...prev.activeSystems, percussion: checked }
                  }));
                }}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </div>

            {/* System C: Harmonic Geometry */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-xs font-semibold">Harmonic Geometry</span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Wireframes evolving with spectral centroid
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.activeSystems.harmonic}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    activeSystems: { ...prev.activeSystems, harmonic: checked }
                  }));
                }}
                className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
              />
            </div>

            {/* System D: Bass Field */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-xs font-semibold">Bass Field</span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Continuous liquid undulating contours
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.activeSystems.bass}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    activeSystems: { ...prev.activeSystems, bass: checked }
                  }));
                }}
                className="w-4 h-4 accent-purple-400 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Post Processing Toggles */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[10px] text-white/50 tracking-wider block">
              RENDER POST-PROCESSING
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Motion Persistence (Trails)</span>
              <input
                type="checkbox"
                checked={settings.postProcessing.trails}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    postProcessing: { ...prev.postProcessing, trails: checked }
                  }));
                }}
                className="accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Instrument Reticle Overlay</span>
              <input
                type="checkbox"
                checked={settings.postProcessing.filmGrain}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    postProcessing: { ...prev.postProcessing, filmGrain: checked }
                  }));
                }}
                className="accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Stereo Towers & Horizon Elements */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[10px] text-white/50 tracking-wider block">
              STEREO TOWERS & HORIZON BEAMS
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Stereo Audio Towers (L/R)</span>
              <input
                type="checkbox"
                checked={settings.flanks?.stereoTowers ?? true}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    flanks: { ...prev.flanks, stereoTowers: checked }
                  }));
                }}
                className="accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Horizontal Oscilloscope Beam</span>
              <input
                type="checkbox"
                checked={settings.flanks?.horizontalOscilloscope ?? true}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    flanks: { ...prev.flanks, horizontalOscilloscope: checked }
                  }));
                }}
                className="accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Constellation Star Clusters</span>
              <input
                type="checkbox"
                checked={settings.flanks?.constellations ?? true}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    flanks: { ...prev.flanks, constellations: checked }
                  }));
                }}
                className="accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKDROP & STATIC AI LOGO */}
      {activeTab === 'backdrop' && (
        <div className="space-y-4">
          {/* Big Screen Mode Button */}
          {onToggleBigScreen && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-purple-950/40 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  Big Screen Exhibition
                </span>
                <span className="text-[10px] text-cyan-300 font-mono">Stage Mode</span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed mb-3">
                Hides all dashboards and headers. Auto-hides mouse cursor for live concert projection and big screen installations.
              </p>
              <button
                onClick={onToggleBigScreen}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Launch Big Screen Mode</span>
              </button>
            </div>
          )}

          {/* Background Texture Controls */}
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold block">Obsidian Grain Texture</span>
                <span className="text-[10px] text-white/40">Organic dark slate backdrop</span>
              </div>
              <input
                type="checkbox"
                checked={settings.background.textureEnabled}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    background: { ...prev.background, textureEnabled: checked }
                  }));
                }}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            {settings.background.textureEnabled && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-white/60">Texture Opacity</span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round(settings.background.textureOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.05"
                  value={settings.background.textureOpacity}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings(prev => ({
                      ...prev,
                      background: { ...prev.background, textureOpacity: val }
                    }));
                  }}
                  className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Static AI Logo Embedding Controls */}
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold block">Embed Logo in Background</span>
                <span className="text-[10px] text-white/40">Centered static AI emblem</span>
              </div>
              <input
                type="checkbox"
                checked={settings.logo.enabled}
                onChange={e => {
                  const checked = e.target.checked;
                  onUpdateSettings(prev => ({
                    ...prev,
                    logo: { ...prev.logo, enabled: checked }
                  }));
                }}
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>

            {settings.logo.enabled && (
              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/60">Logo Watermark Opacity</span>
                    <span className="text-purple-300 font-bold">
                      {Math.round(settings.logo.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={settings.logo.opacity}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      onUpdateSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, opacity: val }
                      }));
                    }}
                    className="w-full accent-purple-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/60">Logo Size</span>
                    <span className="text-purple-300 font-bold">{settings.logo.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="140"
                    max="450"
                    step="10"
                    value={settings.logo.size}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      onUpdateSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, size: val }
                      }));
                    }}
                    className="w-full accent-purple-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Seamless Logo Blending Mode */}
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] text-white/50 tracking-wider block">STAGE BLENDING MODE</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {[
                      { id: 'screen' as LogoBlendMode, label: 'Screen (Black BG)' },
                      { id: 'lighten' as LogoBlendMode, label: 'Lighten (Bloom)' },
                      { id: 'multiply' as LogoBlendMode, label: 'Multiply (White BG)' },
                      { id: 'source-over' as LogoBlendMode, label: 'Natural Crisp' }
                    ].map(b => (
                      <button
                        key={b.id}
                        onClick={() => onUpdateSettings(prev => ({
                          ...prev,
                          logo: { ...prev.logo, blendMode: b.id }
                        }))}
                        className={`py-1.5 px-2 rounded border text-left truncate transition-all ${
                          (settings.logo.blendMode || 'screen') === b.id
                            ? 'bg-purple-500/25 border-purple-400/60 text-purple-200 font-bold'
                            : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seamless Radial Feathering Toggle */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-white/80 block">Radial Edge Dissolve</span>
                    <span className="text-[10px] text-white/40">Soft feather eliminates square box borders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.logo.featherEdge !== false}
                    onChange={e => {
                      const checked = e.target.checked;
                      onUpdateSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, featherEdge: checked }
                      }));
                    }}
                    className="accent-purple-400 cursor-pointer"
                  />
                </div>

                {/* Atmospheric Stage Halo Glow */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-white/80 block">Atmospheric Halo Backlight</span>
                    <span className="text-[10px] text-white/40">Bathes emblem in visualizer palette</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.logo.haloGlow !== false}
                    onChange={e => {
                      const checked = e.target.checked;
                      onUpdateSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, haloGlow: checked }
                      }));
                    }}
                    className="accent-purple-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-white/70">Pulse With Bass Energy</span>
                  <input
                    type="checkbox"
                    checked={settings.logo.pulseWithBass}
                    onChange={e => {
                      const checked = e.target.checked;
                      onUpdateSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, pulseWithBass: checked }
                      }));
                    }}
                    className="accent-purple-400 cursor-pointer"
                  />
                </div>

                {/* Custom Logo Upload option */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <input
                    ref={logoUploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomLogoUpload}
                  />
                  <button
                    onClick={() => logoUploadRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80 hover:text-white"
                  >
                    <Upload className="w-3 h-3 text-cyan-400" />
                    <span>Upload Custom Logo</span>
                  </button>

                  {settings.logo.customUrl && (
                    <button
                      onClick={resetToAiLogo}
                      title="Reset to Synchro AI Emblem"
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Recent Logos Vault (Multi-Session Gallery) */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50 tracking-wider flex items-center gap-1.5">
                      <FolderHeart className="w-3 h-3 text-purple-400" />
                      RECENT LOGOS VAULT
                    </span>
                    <span className="text-[9px] text-white/40">{recentLogos.length + 1} stored</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {/* Default Synchro AI Emblem */}
                    <button
                      onClick={resetToAiLogo}
                      className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] transition-all group ${
                        !settings.logo.customUrl
                          ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 ring-1 ring-purple-400/40'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden mb-1">
                        <img src="/logos/synchro_logo.jpg" alt="AI Emblem" className="w-full h-full object-contain" />
                      </div>
                      <span className="truncate w-full text-center text-[9px]">AI Emblem</span>
                    </button>

                    {/* Stored Previous Logos */}
                    {recentLogos.map(logo => (
                      <div
                        key={logo.id}
                        onClick={() => handleSelectRecentLogo(logo.dataUrl)}
                        className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] cursor-pointer transition-all group ${
                          settings.logo.customUrl === logo.dataUrl
                            ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 ring-1 ring-purple-400/40'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden mb-1">
                          <img src={logo.dataUrl} alt={logo.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="truncate w-full text-center text-[9px]">{logo.name}</span>

                        {/* Delete stored logo button */}
                        <button
                          onClick={e => handleDeleteRecentLogo(logo.id, e)}
                          title="Remove from vault"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600/80 hover:bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};
