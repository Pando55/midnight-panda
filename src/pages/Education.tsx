import { useState } from 'react';
import { BookOpen, Play, FileText, Download, GraduationCap, TrendingUp, BarChart3, Shield, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

// Lesser-known, high-quality trading content creators
const videoLessons: VideoLesson[] = [
  {
    id: '1', title: 'Order Flow & Liquidity Pools — The Hidden Layer',
    description: 'How institutional traders use order flow to trap retail — liquidity sweeps, stop hunts, and engineered moves.',
    youtubeId: 'cFR6ggTqFos', duration: '31:42', level: 'advanced', category: 'Order Flow'
  },
  {
    id: '2', title: 'Wyckoff Method — Read the Market Like a Book',
    description: 'Accumulation, distribution, springs & upthrusts. The 100-year-old method institutions still use.',
    youtubeId: '3BKAG4DCN7s', duration: '28:15', level: 'advanced', category: 'Wyckoff'
  },
  {
    id: '3', title: 'Market Structure Shifts vs. Break of Structure',
    description: 'The subtle difference that changes everything — learn when a trend truly reverses.',
    youtubeId: 'q2FSHZ7yeeM', duration: '22:30', level: 'intermediate', category: 'Price Action'
  },
  {
    id: '4', title: 'Fibonacci Mastery — Beyond the Basics',
    description: 'Optimal trade entries, extensions, and confluences. Stop using Fib like a beginner.',
    youtubeId: 'SmlmLBLYrVQ', duration: '25:18', level: 'intermediate', category: 'Fibonacci'
  },
  {
    id: '5', title: 'Supply & Demand Zone Trading',
    description: 'How to find high-probability zones where price will react — not just random support/resistance.',
    youtubeId: 'ViP7J_ZVTXQ', duration: '19:45', level: 'beginner', category: 'Supply & Demand'
  },
  {
    id: '6', title: 'Multi-Timeframe Analysis — The Edge You Need',
    description: 'How to align H1, H4, and D1 for sniper entries. Stop trading single timeframes.',
    youtubeId: 'V0JH9KdISk0', duration: '24:10', level: 'intermediate', category: 'Multi-TF'
  },
  {
    id: '7', title: 'Volume Profile — See Where the Money Sits',
    description: 'Point of control, value areas, and naked POCs. The tool most retail traders ignore.',
    youtubeId: '83smGBmNJSM', duration: '33:20', level: 'advanced', category: 'Volume Profile'
  },
  {
    id: '8', title: 'Candlestick Psychology — What Wicks Really Tell You',
    description: 'Beyond patterns: understand the story behind every candle. Rejection, absorption, and intent.',
    youtubeId: 'RVwOJBXpE10', duration: '17:50', level: 'beginner', category: 'Price Action'
  },
  {
    id: '9', title: 'Session-Based Trading — London & NY Killzones',
    description: 'Why 90% of the best moves happen in specific windows. Time your entries like a pro.',
    youtubeId: 'P7NVYJ-YH6Y', duration: '20:15', level: 'intermediate', category: 'Sessions'
  },
  {
    id: '10', title: 'The Only Risk Management Video You Need',
    description: 'Asymmetric risk, Kelly criterion, drawdown recovery math. The unsexy stuff that makes you rich.',
    youtubeId: '0dL_s4BcSQo', duration: '16:40', level: 'beginner', category: 'Risk Management'
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
  beginner: 'bg-[hsl(152,100%,39%)]/20 text-[hsl(152,100%,39%)] border-[hsl(152,100%,39%)]/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-destructive/20 text-destructive border-destructive/30',
};

const WHATSAPP_LINK = 'https://wa.me/27784278143?text=Hi%2C%20I%20need%20a%20Midnight%20Panda%20license%20key';

function VideoCard({ lesson }: { lesson: VideoLesson }) {
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
            <button onClick={() => setPlaying(true)} className="w-full h-full relative group cursor-pointer">
              <img src={`https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`} alt={lesson.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-black/80 text-xs text-foreground px-2 py-0.5 rounded">{lesson.duration}</span>
            </button>
          )}
        </AspectRatio>
      </div>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className={`text-[10px] ${levelColors[lesson.level]}`}>{lesson.level}</Badge>
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
            <Badge variant="outline" className={`text-[10px] ${levelColors[guide.level]}`}>{guide.level}</Badge>
            <span className="text-[10px] text-muted-foreground">{guide.pages} pages</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight mb-0.5">{guide.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{guide.description}</p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download PDF
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
        <p className="text-sm text-muted-foreground">Strategies most traders will never learn</p>
      </div>

      {/* WhatsApp contact banner */}
      <div className="px-4 mb-4">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(142,70%,45%)]/10 border border-[hsl(142,70%,45%)]/30 hover:bg-[hsl(142,70%,45%)]/20 transition-colors"
        >
          <MessageCircle className="w-5 h-5 text-[hsl(142,70%,45%)]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Need a license key?</p>
            <p className="text-xs text-muted-foreground">WhatsApp: 078 427 8143</p>
          </div>
          <span className="text-xs text-[hsl(142,70%,45%)] font-medium">Chat →</span>
        </a>
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
            filteredVideos.map((lesson) => <VideoCard key={lesson.id} lesson={lesson} />)
          )}
        </TabsContent>

        <TabsContent value="guides" className="space-y-3 mt-0">
          {filteredPDFs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No guides for this level yet.</p>
          ) : (
            filteredPDFs.map((guide) => <PDFCard key={guide.id} guide={guide} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
