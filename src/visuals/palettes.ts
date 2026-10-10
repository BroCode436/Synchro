import { ColorPalette } from '../types/visual';

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'synchro-default',
    name: 'Electric Neon (Original)',
    description: 'Electric mint melody, icy blue harmony, amber percussion, violet bass',
    colors: {
      background: '#040508',
      melodic: '#00ffcc',       // Electric mint / cyan
      harmonic: '#38bdf8',      // Icy blue
      percussion: '#ff6b35',    // Coral / amber
      bass: '#a855f7',          // Violet
      accent: '#ffffff',        // White
      glow: 'rgba(0, 255, 204, 0.4)'
    }
  },
  {
    id: 'neon-aurora',
    name: 'Neon Aurora',
    description: 'Vibrant emeralds, deep magentas, and arctic cyan',
    colors: {
      background: '#030708',
      melodic: '#10b981',       // Emerald
      harmonic: '#06b6d4',      // Arctic cyan
      percussion: '#f43f5e',    // Rose pink
      bass: '#8b5cf6',          // Deep purple
      accent: '#f8fafc',        // Pure white
      glow: 'rgba(16, 185, 129, 0.4)'
    }
  },
  {
    id: 'solar-coral',
    name: 'Solar Flare',
    description: 'Fiery gold melody, sunset amber, and ultraviolet depths',
    colors: {
      background: '#070504',
      melodic: '#f59e0b',       // Warm amber
      harmonic: '#fb923c',      // Solar orange
      percussion: '#ef4444',    // High-heat crimson
      bass: '#9333ea',          // Ultraviolet
      accent: '#fef08a',        // Solar light
      glow: 'rgba(245, 158, 11, 0.4)'
    }
  },
  {
    id: 'deep-abyss',
    name: 'Deep Abyss',
    description: 'Subterranean cobalt, bioluminescent teal, and oceanic blues',
    colors: {
      background: '#02040a',
      melodic: '#22d3ee',       // Bioluminescent teal
      harmonic: '#3b82f6',      // Cobalt
      percussion: '#06b6d4',    // Bright aqua
      bass: '#4338ca',          // Deep indigo
      accent: '#e0f2fe',        // Ice white
      glow: 'rgba(34, 211, 238, 0.35)'
    }
  },
  {
    id: 'sketch-monochrome',
    name: 'Monochrome Sketch',
    description: 'High-contrast stark silver linework, titanium accents, and deep obsidian',
    colors: {
      background: '#060608',
      melodic: '#e2e8f0',       // Platinum / silver
      harmonic: '#94a3b8',      // Slate grey
      percussion: '#ffffff',    // Stark white
      bass: '#64748b',          // Charcoal blue
      accent: '#ffffff',        // Crisp white
      glow: 'rgba(255, 255, 255, 0.35)'
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Shinjuku neon violet, magenta impact flashes, and laser cyan',
    colors: {
      background: '#05040a',
      melodic: '#00f5d4',       // Laser cyan
      harmonic: '#7b2cbf',      // Deep royal violet
      percussion: '#ff007f',    // Hot magenta
      bass: '#3a0ca3',          // Dark blue-violet
      accent: '#ffffff',        // White
      glow: 'rgba(255, 0, 127, 0.4)'
    }
  },
  {
    id: 'cyberpunk-matrix',
    name: 'Cyberpunk Matrix',
    description: 'Phosphor terminal green, digital lime, cyber amber, and black obsidian',
    colors: {
      background: '#020703',
      melodic: '#22c55e',       // Phosphor green
      harmonic: '#84cc16',      // Digital lime
      percussion: '#f59e0b',    // Cyber amber
      bass: '#15803d',          // Deep terminal green
      accent: '#f0fdf4',        // Crisp white-green
      glow: 'rgba(34, 197, 94, 0.4)'
    }
  },
  {
    id: 'vaporwave-sunset',
    name: 'Vaporwave Sunset',
    description: 'Pastel violet, neon hot pink, soft turquoise, and deep plum',
    colors: {
      background: '#0a050d',
      melodic: '#f43f5e',       // Neon pink
      harmonic: '#2dd4bf',      // Soft turquoise
      percussion: '#fb7185',    // Coral pink
      bass: '#a855f7',          // Pastel violet
      accent: '#fff1f2',        // Soft ivory
      glow: 'rgba(244, 63, 94, 0.4)'
    }
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    description: 'Crimson blood red, dark ruby, burnt copper, and bronze obsidian',
    colors: {
      background: '#080303',
      melodic: '#ef4444',       // Crimson red
      harmonic: '#f97316',      // Burnt orange
      percussion: '#dc2626',    // Dark ruby
      bass: '#7f1d1d',          // Deep maroon
      accent: '#fee2e2',        // Ghost red-white
      glow: 'rgba(239, 68, 68, 0.4)'
    }
  },
  {
    id: 'celestial-gold',
    name: 'Celestial Gold',
    description: 'Royal champagne gold, luminous ivory, amber bronze, and deep night',
    colors: {
      background: '#070604',
      melodic: '#eab308',       // Champagne gold
      harmonic: '#ca8a04',      // Royal amber
      percussion: '#f59e0b',    // Luminous gold
      bass: '#78350f',          // Deep bronze
      accent: '#fef9c3',        // Radiant ivory
      glow: 'rgba(234, 179, 8, 0.4)'
    }
  },
  {
    id: 'ultraviolet-dream',
    name: 'Ultraviolet Dream',
    description: 'Pure neon violet, electric indigo, fluorescent cyan, and dark sapphire',
    colors: {
      background: '#05030d',
      melodic: '#8b5cf6',       // Electric indigo
      harmonic: '#06b6d4',      // Fluorescent cyan
      percussion: '#c084fc',    // Bright violet
      bass: '#4c1d95',          // Deep sapphire violet
      accent: '#faf5ff',        // Pure white
      glow: 'rgba(139, 92, 246, 0.45)'
    }
  },
  {
    id: 'prismatic-opal',
    name: 'Prismatic Opal',
    description: 'Multidimensional iridescent rainbow spectrum with crystalline clarity',
    colors: {
      background: '#040509',
      melodic: '#38bdf8',       // Sky blue
      harmonic: '#a855f7',      // Iridescent purple
      percussion: '#f43f5e',    // Rose pink
      bass: '#10b981',          // Emerald
      accent: '#ffffff',        // Diamond white
      glow: 'rgba(56, 189, 248, 0.4)'
    }
  }
];

export function getPalette(id: string, customColors?: import('../types/visual').CustomColorPalette): ColorPalette {
  if (id === 'custom' && customColors) {
    return {
      id: 'custom',
      name: 'Custom User Theme',
      description: 'User-customized bespoke stage visualizer palette',
      colors: {
        background: '#040508',
        melodic: customColors.melodic || '#00ffcc',
        harmonic: customColors.harmonic || '#38bdf8',
        percussion: customColors.percussion || '#ff6b35',
        bass: customColors.bass || '#a855f7',
        accent: customColors.accent || '#ffffff',
        glow: customColors.melodic ? `${customColors.melodic}66` : 'rgba(0, 255, 204, 0.4)'
      }
    };
  }
  return COLOR_PALETTES.find(p => p.id === id) || COLOR_PALETTES[0];
}
