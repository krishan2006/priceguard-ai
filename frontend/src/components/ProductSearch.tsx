// ProductSearch.tsx — Smart product search with match scoring & attribute display
import React, { useState, useCallback, useRef } from 'react';
import {
  Search, Star, ExternalLink, CheckCircle, AlertCircle,
  Tag, Zap, ChevronRight, Loader2, Lock, Cpu, HardDrive,
  Palette, Package
} from 'lucide-react';
import * as api from '../services/api';

// ─── Types ───────────────────────────────────────────────────
interface SearchResult {
  id?: string;
  name: string;
  brand?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  rating?: number;
  image_url?: string;
  source: string;
  source_url?: string;
  category?: string;
  description?: string;
  match_score?: number;
  match_label?: string;
  is_recommended?: boolean;
  score_breakdown?: Record<string, number>;
  extracted_brand?: string;
  extracted_model?: string;
  extracted_storage?: string;
  extracted_ram?: string;
  extracted_color?: string;
  extracted_generation?: string;
  extracted_category?: string;
}

interface QueryAttributes {
  brand?: string;
  model?: string;
  generation?: string;
  storage?: string;
  ram?: string;
  color?: string;
  category?: string;
  variant?: string;
}

interface SearchResponse {
  query: string;
  query_attributes: QueryAttributes;
  results: SearchResult[];
  count: number;
  has_exact_match: boolean;
  has_strong_match: boolean;
}

export interface SelectedProduct {
  name: string;
  brand?: string;
  price: number;
  image_url?: string;
  source: string;
  source_url?: string;
  match_score: number;
  match_label: string;
  extracted_brand?: string;
  extracted_model?: string;
  extracted_storage?: string;
  extracted_ram?: string;
  extracted_color?: string;
  extracted_generation?: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function fmtPrice(p: number) {
  return `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function matchLabelStyle(label?: string) {
  switch (label) {
    case 'EXACT':    return { badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400', icon: '✓' };
    case 'STRONG':   return { badge: 'bg-blue-900/60 text-blue-300 border-blue-500/40', dot: 'bg-blue-400', icon: '◉' };
    case 'POSSIBLE': return { badge: 'bg-yellow-900/60 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-400', icon: '~' };
    default:         return { badge: 'bg-slate-700/60 text-slate-400 border-slate-600/40', dot: 'bg-slate-500', icon: '?' };
  }
}

// ─── Score Bar ────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? '#34d399' : pct >= 75 ? '#60a5fa' : pct >= 60 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─── Attribute Pill ───────────────────────────────────────────
function AttrPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
      <Icon size={12} className="text-purple-400 flex-shrink-0" />
      <span className="text-slate-500 text-xs">{label}:</span>
      <span className="text-slate-300 text-xs font-medium">{value}</span>
    </div>
  );
}

// ─── Query Attributes Card ────────────────────────────────────
function QueryAttributesCard({ attrs }: { attrs: QueryAttributes }) {
  const hasAttrs = Object.values(attrs).some(Boolean);
  if (!hasAttrs) return null;
  return (
    <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-lg">
      <p className="text-purple-400 text-xs font-medium mb-2">🧠 AI extracted from your search:</p>
      <div className="flex flex-wrap gap-2">
        {attrs.brand && (
          <span className="badge bg-blue-900/40 text-blue-300 border border-blue-500/30 text-xs capitalize">
            Brand: {attrs.brand}
          </span>
        )}
        {attrs.model && (
          <span className="badge bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs">
            Model: {attrs.model}
          </span>
        )}
        {attrs.generation && (
          <span className="badge bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 text-xs">
            {attrs.generation}
          </span>
        )}
        {attrs.storage && (
          <span className="badge bg-teal-900/40 text-teal-300 border border-teal-500/30 text-xs">
            💾 {attrs.storage}
          </span>
        )}
        {attrs.ram && (
          <span className="badge bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 text-xs">
            🧠 {attrs.ram}
          </span>
        )}
        {attrs.color && (
          <span className="badge bg-pink-900/40 text-pink-300 border border-pink-500/30 text-xs capitalize">
            🎨 {attrs.color}
          </span>
        )}
        {attrs.category && (
          <span className="badge bg-slate-700/50 text-slate-400 border border-slate-500/30 text-xs capitalize">
            {attrs.category}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────
function ProductCard({
  product,
  onSelect,
  isSelected,
}: {
  product: SearchResult;
  onSelect: (p: SearchResult) => void;
  isSelected: boolean;
}) {
  const style = matchLabelStyle(product.match_label);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div
      onClick={() => onSelect(product)}
      className={`glass-card p-4 cursor-pointer transition-all duration-200 hover:border-purple-500/40 hover:shadow-lg ${
        isSelected ? 'border-purple-500/60 bg-purple-900/10 shadow-lg shadow-purple-500/10' : ''
      } ${product.match_label === 'EXACT' ? 'border-emerald-500/30' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Image */}
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={22} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-white font-medium text-sm leading-tight line-clamp-2 flex-1">{product.name}</h4>
            {/* Match badge */}
            <span className={`badge border text-xs flex-shrink-0 ${style.badge}`}>
              {style.icon} {product.match_label}
            </span>
          </div>

          {product.brand && (
            <p className="text-slate-500 text-xs mt-0.5 capitalize">{product.brand}</p>
          )}

          {/* Extracted attributes */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {product.extracted_storage && (
              <span className="text-xs bg-teal-900/30 text-teal-400 border border-teal-500/20 rounded px-1.5 py-0.5">
                💾 {product.extracted_storage}
              </span>
            )}
            {product.extracted_ram && (
              <span className="text-xs bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded px-1.5 py-0.5">
                🧠 {product.extracted_ram}
              </span>
            )}
            {product.extracted_color && (
              <span className="text-xs bg-pink-900/30 text-pink-400 border border-pink-500/20 rounded px-1.5 py-0.5 capitalize">
                🎨 {product.extracted_color}
              </span>
            )}
            {product.extracted_generation && (
              <span className="text-xs bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 rounded px-1.5 py-0.5">
                {product.extracted_generation}
              </span>
            )}
          </div>
        </div>

        {/* Selected */}
        {isSelected && (
          <CheckCircle size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Price row */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-emerald-400 font-bold text-lg">{fmtPrice(product.price)}</span>
        {product.original_price && product.original_price > product.price && (
          <span className="text-slate-600 text-sm line-through">{fmtPrice(product.original_price)}</span>
        )}
        {product.discount_percentage && product.discount_percentage > 0.5 && (
          <span className="badge bg-red-900/50 text-red-400 border border-red-500/30 text-xs">
            {product.discount_percentage.toFixed(0)}% OFF
          </span>
        )}
        {product.rating && product.rating > 0 && (
          <span className="flex items-center gap-1 text-yellow-400 text-xs ml-auto">
            <Star size={11} fill="currentColor" /> {product.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Match score bar */}
      {product.match_score !== undefined && (
        <div className="mt-2">
          <ScoreBar score={product.match_score} />
        </div>
      )}

      {/* Source & breakdown toggle */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="badge bg-slate-700/50 text-slate-500 border border-slate-600/30 text-xs">
            {product.source}
          </span>
          {product.source_url && (
            <a
              href={product.source_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-600 hover:text-slate-400 transition-colors"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        {product.score_breakdown && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowBreakdown((v) => !v); }}
            className="text-slate-600 hover:text-slate-400 text-xs flex items-center gap-1"
          >
            Score details <ChevronRight size={11} className={`transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* Score breakdown */}
      {showBreakdown && product.score_breakdown && (
        <div
          className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/5 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(product.score_breakdown).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-slate-600 text-xs capitalize">{key}</span>
              <div className="flex items-center gap-1.5 w-20">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(val * 100)}%`,
                      backgroundColor: val >= 0.8 ? '#34d399' : val >= 0.5 ? '#fbbf24' : '#f87171',
                    }}
                  />
                </div>
                <span className="text-slate-500 text-xs w-6 text-right">{Math.round(val * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── No Match Warning ─────────────────────────────────────────
function NoMatchWarning({ topCandidates }: { topCandidates: SearchResult[] }) {
  return (
    <div className="glass-card p-5 border-yellow-500/30 bg-yellow-900/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={18} className="text-yellow-400" />
        <p className="text-yellow-300 font-medium">No exact product found. Did you mean?</p>
      </div>
      <p className="text-slate-500 text-xs mb-3">
        We couldn't find a strong match. Please select the closest option below or refine your search.
      </p>
      <div className="space-y-2">
        {topCandidates.slice(0, 3).map((p, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5">
            <div>
              <p className="text-white text-sm">{p.name}</p>
              <p className="text-slate-500 text-xs">{fmtPrice(p.price)}</p>
            </div>
            <span className={`badge border text-xs ${matchLabelStyle(p.match_label).badge}`}>
              {Math.round((p.match_score || 0) * 100)}% match
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
interface ProductSearchProps {
  onProductSelect: (product: SelectedProduct | null) => void;
  selectedProduct: SelectedProduct | null;
}

export default function ProductSearch({ onProductSelect, selectedProduct }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async (q: string = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearchData(null);
    onProductSelect(null);

    try {
      const data = await api.searchProducts(q.trim()) as unknown as SearchResponse;
      setSearchData(data);
      if (!data.results.length) {
        setError('No products found. Try a different search term.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, onProductSelect]);

  const handleSelect = (product: SearchResult) => {
    const sel: SelectedProduct = {
      name: product.name,
      brand: product.brand,
      price: product.price,
      image_url: product.image_url,
      source: product.source,
      source_url: product.source_url,
      match_score: product.match_score ?? 0,
      match_label: product.match_label ?? 'WEAK',
      extracted_brand: product.extracted_brand,
      extracted_model: product.extracted_model,
      extracted_storage: product.extracted_storage,
      extracted_ram: product.extracted_ram,
      extracted_color: product.extracted_color,
      extracted_generation: product.extracted_generation,
    };
    onProductSelect(sel);
  };

  const hasNoStrongMatch = searchData && !searchData.has_strong_match && searchData.results.length > 0;
  const exactResults: SearchResult[] = searchData ? searchData.results.filter((r: SearchResult) => r.match_label === 'EXACT') : [];
  const strongResults: SearchResult[] = searchData ? searchData.results.filter((r: SearchResult) => r.match_label === 'STRONG') : [];
  const possibleResults: SearchResult[] = searchData ? searchData.results.filter((r: SearchResult) => r.match_label === 'POSSIBLE') : [];
  const weakResults: SearchResult[] = searchData ? searchData.results.filter((r: SearchResult) => !['EXACT','STRONG','POSSIBLE'].includes(r.match_label ?? '')) : [];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#0E1016] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            placeholder='e.g. "iPhone 15 128GB Black" or "Samsung S25 Ultra 256GB"'
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className="btn-primary px-5 flex items-center gap-2 flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </div>

      {/* Search tips */}
      {!searchData && !loading && (
        <div className="flex flex-wrap gap-2">
          {['iPhone 15 128GB Black', 'Samsung S25 Ultra 256GB', 'HP Victus i5 RTX 4050', 'Sony WH-1000XM5'].map((tip) => (
            <button
              key={tip}
              onClick={() => { setQuery(tip); handleSearch(tip); }}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-full text-slate-400 hover:text-white transition-all"
            >
              {tip}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-white/3 rounded-lg border border-white/5">
          <Loader2 size={18} className="animate-spin text-purple-400" />
          <div>
            <p className="text-white text-sm">Searching across multiple sources…</p>
            <p className="text-slate-500 text-xs mt-0.5">Extracting attributes · Ranking by match score</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Query attributes */}
      {searchData?.query_attributes && (
        <QueryAttributesCard attrs={searchData.query_attributes} />
      )}

      {/* No strong match warning */}
      {hasNoStrongMatch && (
        <NoMatchWarning topCandidates={searchData?.results ?? []} />
      )}

      {/* Selected product confirmation */}
      {selectedProduct && (
        <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Lock size={16} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-purple-300 font-medium text-sm flex items-center gap-2">
              Product Locked
              <span className={`badge border text-xs ${matchLabelStyle(selectedProduct.match_label).badge}`}>
                {selectedProduct.match_label} · {Math.round(selectedProduct.match_score * 100)}%
              </span>
            </p>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{selectedProduct.name}</p>
          </div>
          <button
            onClick={() => onProductSelect(null)}
            className="text-slate-500 hover:text-red-400 text-xs transition-colors"
          >
            Change
          </button>
        </div>
      )}

      {/* Results */}
      {searchData && !selectedProduct && (
        <div className="space-y-5">
          {exactResults.length > 0 && (
            <div>
              <p className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle size={13} /> Exact Matches
              </p>
              <div className="space-y-2">
                {exactResults.map((r, i) => (
                  <ProductCard key={i} product={r} onSelect={handleSelect} isSelected={false} />
                ))}
              </div>
            </div>
          )}
          {strongResults.length > 0 && (
            <div>
              <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-2">Strong Matches</p>
              <div className="space-y-2">
                {strongResults.map((r, i) => (
                  <ProductCard key={i} product={r} onSelect={handleSelect} isSelected={false} />
                ))}
              </div>
            </div>
          )}
          {possibleResults.length > 0 && (
            <div>
              <p className="text-yellow-400 text-xs font-medium uppercase tracking-wider mb-2">Possible Matches</p>
              <div className="space-y-2">
                {possibleResults.map((r, i) => (
                  <ProductCard key={i} product={r} onSelect={handleSelect} isSelected={false} />
                ))}
              </div>
            </div>
          )}
          {weakResults.length > 0 && (exactResults.length + strongResults.length + possibleResults.length === 0) && (
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Other Results (Low confidence)</p>
              <div className="space-y-2">
                {weakResults.map((r, i) => (
                  <ProductCard key={i} product={r} onSelect={handleSelect} isSelected={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
