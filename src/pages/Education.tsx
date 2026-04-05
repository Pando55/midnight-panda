import { useState } from 'react';
import { BookOpen, Play, FileText, Download, ChevronRight, GraduationCap, TrendingUp, BarChart3, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AspectRatio } from '@/components/ui/aspect-ratio';

type Level = 'beginner' | 'intermediate' | 'advanced';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  level: Level;
  category: string;
}

interface PDFGuide {
  id: string;
  title: string;
  description: string;
  level: Level;
  pages: number;
  url: string;
  icon: typeof FileText;
}

const videoLessons: VideoLesson[] = [
  {
    id: '1', title: 'Forex Trading for Beginners (Full Course)',
    description: 'Complete introduction to forex markets, currency pairs, and how trading works.',
    youtubeId: 'Jlxkfx4yr3w', duration: '26:14', level: 'beginner', category: 'Forex Basics'
  },
  {
    id: '2', title: 'How to Read Candlestick Charts',
    description: 'Master candlestick patterns — doji, engulfing, hammer, and more.',
    youtubeId: 'C3KRwfj9F8Q', duration: '18:32', level: 'beginner', category: 'Technical Analysis'
  },
  {
    id: '3', title: 'Support & Resistance Trading Strategy',
    description: 'Learn to identify key price levels and trade bounces and breakouts.',
    youtubeId: '5gZsPLhBIJo', duration: '22:10', level: 'intermediate', category: 'Technical Analysis'
  },
  {
    id: '4', title: 'Risk Management & Position Sizing',
    description: 'The #1 skill that separates profitable traders from losers.',
    youtubeId: 'EfgS--SDRnE', duration: '15:45', level: 'beginner', category: 'Risk Management'
  },
  {
    id: '5', title: 'Smart Money Concepts (SMC) Explained',
    description: 'Institutional order flow, order blocks, fair value gaps, and liquidity.',
    youtubeId: 'nMNASeJCRpg', duration: '34:20', level: 'advanced', category: 'Advanced Strategy'
  },
  {
    id: '6', title: 'ICT Trading Strategy — Full Breakdown',
    description: 'Inner Circle Trader methodology: market structure, displacement, and entries.',
    youtubeId: '3tGRd5JMgR8', duration: '42:15', level: 'advanced', category: 'Advanced Strategy'
  },
  {
    id: '7', title: 'How to Use Moving Averages',
    description: 'SMA, EMA crossovers, and dynamic support/resistance with moving averages.',
    youtubeId: '4R2CDbQU5kk', duration: '19:50', level: 'intermediate', category: 'Technical Analysis'
  },
  {
    id: '8', title: 'Trading Psychology — Control Your Emotions',
    description: 'Overcome fear, greed, and revenge trading to become consistently profitable.',
    youtubeId: 'jJi0DRbLnhQ', duration: '20:30', level: 'intermediate', category: 'Psychology'
  },
];

const pdfGuides: PDFGuide[] = [
  {
    id: '1', title: 'Forex Trading Starter Guide',
    description: 'Everything a beginner needs: terminology, market hours, currency pairs, and your first trades.',
    level: 'beginner', pages: 24, url: '#', icon: BookOpen
  },
  {
    id: '2', title: 'Candlestick Patterns Cheat Sheet',
    description: 'Visual reference for 25+ candlestick patterns with entry/exit rules.',
    level: 'beginner', pages: 12, url: '#', icon: BarChart3
  },
  {
    id: '3', title: 'Risk Management Blueprint',
    description: 'Position sizing formulas, risk-reward ratios, and portfolio management strategies.',
    level: 'intermediate', pages: 18, url: '#', icon: Shield
  },
  {
    id: '4', title: 'Technical Analysis Masterclass',
    description: 'Chart patterns, indicators, Fibonacci, Elliott Wave, and multi-timeframe analysis.',
    level: 'intermediate', pages: 45, url: '#', icon: TrendingUp
  },
  {
    id: '5', title: 'Smart Money & Institutional Trading',
    description: 'Order blocks, breaker blocks, fair value gaps, and liquidity concepts decoded.',
    level: 'advanced', pages: 32, url: '#', icon: GraduationCap
  },
  {
    id: '6', title: 'Trading Journal Template',
    description: 'Printable journal with trade log, weekly review, and performance tracker.',
    level: 'beginner', pages: 8, url: '#', icon: FileText
  },
];

const levelColors: Record<Level, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function VideoCard({ lesson, onPlay }: { lesson: VideoLesson; onPlay: (id: string) => void }) {
  const [playing, setPlaying] = useState(false);

  return (
    <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${lesson.youtubeId}?autoplay=1&rel=0`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={lesson.title}
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="w-full h-full relative group cursor-pointer"
            >
              <img
                src={`https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`}
                alt={lesson.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-black/80 text-xs text-foreground px-2 py-0.5 rounded">
                {lesson.duration}
              </span>
            </button>
          )}
        </AspectRatio>
      </div>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className={`text-[10px] ${levelColors[lesson.level]}`}>
            {lesson.level}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{lesson.category}</span>
        </div>
        <h3 className="text-sm font-semibold text-foreground leading-tight mb-1">{lesson.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
      </CardContent>
    </Card>
  );
}

function PDFCard({ guide }: { guide: PDFGuide }) {
  const Icon = guide.icon;
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`text-[10px] ${levelColors[guide.level]}`}>
              {guide.level}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{guide.pages} pages</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight mb-0.5">{guide.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{guide.description}</p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Education() {
  const [levelFilter, setLevelFilter] = useState<'all' | Level>('all');

  const filteredVideos = levelFilter === 'all' ? videoLessons : videoLessons.filter(v => v.level === levelFilter);
  const filteredPDFs = levelFilter === 'all' ? pdfGuides : pdfGuides.filter(p => p.level === levelFilter);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-display">Trading Academy</h1>
        </div>
        <p className="text-sm text-muted-foreground">Learn to trade like a pro — from basics to advanced strategies</p>
      </div>

      {/* Level filter */}
      <div className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              levelFilter === level
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      <Tabs defaultValue="videos" className="px-4">
        <TabsList className="w-full bg-secondary/50 mb-4">
          <TabsTrigger value="videos" className="flex-1 gap-1.5 text-xs">
            <Play className="w-3.5 h-3.5" /> Video Lessons
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex-1 gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> PDF Guides
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-3 mt-0">
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No videos for this level yet.</p>
          ) : (
            filteredVideos.map((lesson) => (
              <VideoCard key={lesson.id} lesson={lesson} onPlay={() => {}} />
            ))
          )}
        </TabsContent>

        <TabsContent value="guides" className="space-y-3 mt-0">
          {filteredPDFs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No guides for this level yet.</p>
          ) : (
            filteredPDFs.map((guide) => (
              <PDFCard key={guide.id} guide={guide} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
