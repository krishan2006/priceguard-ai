// AddMonitor.tsx — 4-Step Interactive AI Agent Setup Wizard
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Lock, CheckCircle, ChevronRight, ChevronLeft,
  Bot, Shield, Zap, Bell, Check, Sparkles, Loader2,
  Package, DollarSign, Calendar, Sliders
} from 'lucide-react';
import * as api from '../services/api';
import ProductSearch, { type SelectedProduct } from '../components/ProductSearch';
import { MONITORING_CONDITIONS } from '../types';

function fmtPrice(p: number) {
  return `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function AddMonitor() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);

  // Form parameters
  const [productName, setProductName] = useState('');
  const [condition, setCondition] = useState('price_below_target');
  const [targetPrice, setTargetPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [discountThreshold, setDiscountThreshold] = useState('');
  const [priceDropPercent, setPriceDropPercent] = useState('');
  const [checkInterval, setCheckInterval] = useState(1);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  // Submission & verification state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const steps = [
    { num: 1, title: 'Find Product', desc: 'Perceive & lock item' },
    { num: 2, title: 'Set Condition', desc: 'Define alert boundary' },
    { num: 3, title: 'Monitoring', desc: 'Frequency & channels' },
    { num: 4, title: 'Review & Launch', desc: 'Activate autonomous loop' },
  ];

  // Auto-fill suggested target price when a product is selected
  const handleSelectProduct = (prod: SelectedProduct | null) => {
    setSelectedProduct(prod);
    if (prod) {
      setProductName(prod.name);
      if (!targetPrice) {
        setTargetPrice(String(Math.round(prod.price * 0.9)));
      }
    }
  };

  const handleTestPerception = async () => {
    const query = selectedProduct?.name || productName;
    if (!query) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.searchProducts(query);
      const top = res.results?.[0] as any;
      if (top) {
        setTestResult(
          `✓ Verified: Found "${top.name}" at ${fmtPrice(top.price)} (${top.match_label || 'MATCH'} match) via ${top.source || 'DummyJSON'}`
        );
      } else {
        setTestResult('⚠️ Standard catalog lookup fallback active (DummyJSON).');
      }
    } catch (e) {
      setTestResult('Perception test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    const finalName = selectedProduct?.name || productName;
    if (!finalName) {
      setErrorMsg('Please select or specify a product first.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    const notifPref = notifyBrowser && notifyEmail
      ? 'all'
      : notifyBrowser
      ? 'browser'
      : notifyEmail
      ? 'email'
      : 'in_app';

    try {
      await api.createMonitor({
        product_name: finalName,
        condition,
        target_price: targetPrice ? parseFloat(targetPrice) : undefined,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        discount_threshold: discountThreshold ? parseFloat(discountThreshold) : undefined,
        price_drop_percent: priceDropPercent ? parseFloat(priceDropPercent) : undefined,
        check_interval_minutes: checkInterval,
        notification_pref: notifPref,
        demo_mode: demoMode,
        search_query: finalName,
        locked_product_name: selectedProduct?.name,
        locked_brand: selectedProduct?.extracted_brand,
        locked_model: selectedProduct?.extracted_model,
        locked_generation: selectedProduct?.extracted_generation,
        locked_storage: selectedProduct?.extracted_storage,
        locked_ram: selectedProduct?.extracted_ram,
        locked_color: selectedProduct?.extracted_color,
        locked_source: selectedProduct?.source,
        locked_source_url: selectedProduct?.source_url,
        locked_match_score: selectedProduct?.match_score,
        product_locked: selectedProduct !== null,
      });
      navigate('/');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch monitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configure Autonomous Monitor</h1>
        <p className="text-slate-400 text-sm mt-1">
          Lock product attributes and set intelligent conditions for the AI agent
        </p>
      </div>

      {/* 4-Step Interactive Breadcrumb Header */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((s) => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;
          return (
            <div
              key={s.num}
              className={`p-3 rounded-xl border text-left transition-all ${
                isCurrent
                  ? 'bg-purple-950/25 border-purple-500/50 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                  : isDone
                  ? 'bg-white/3 border-white/10 opacity-90'
                  : 'bg-white/1 border-white/5 opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isDone ? 'bg-emerald-500 text-black' : isCurrent ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {isDone ? '✓' : s.num}
                </span>
                <span className="text-slate-300 truncate hidden sm:inline">{s.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 truncate hidden md:block">
                {s.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Find & Lock Product ── */}
      {currentStep === 1 && (
        <div className="panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Search size={17} className="text-purple-400" />
                Step 1: Find your product
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Type naturally (e.g. &ldquo;iPhone 15 128GB Black&rdquo;). The AI engine extracts specs & computes match confidence.
              </p>
            </div>
          </div>

          <ProductSearch
            onProductSelect={handleSelectProduct}
            selectedProduct={selectedProduct}
          />

          {!selectedProduct && (
            <div className="pt-3 border-t border-white/6">
              <span className="text-xs text-slate-400 block mb-1">
                Or type custom item query manually:
              </span>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Apple iPhone 15 128GB Black"
                className="input-box text-xs"
              />
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedProduct && !productName.trim()}
              className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4"
            >
              Continue to Step 2 <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Set Condition ── */}
      {currentStep === 2 && (
        <div className="panel p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield size={17} className="text-purple-400" />
              Step 2: Set your condition
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose the mathematical trigger the AI agent will continuously evaluate against live market quotes.
            </p>
          </div>

          {/* Condition Selectors */}
          <div className="space-y-2">
            {MONITORING_CONDITIONS.map((c) => (
              <label
                key={c.value}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  condition === c.value
                    ? 'bg-purple-950/20 border-purple-500/40 text-white'
                    : 'bg-[#0E1016] border-white/8 hover:border-white/15 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value={c.value}
                  checked={condition === c.value}
                  onChange={() => setCondition(c.value)}
                  className="mt-0.5 accent-purple-600"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-white block">
                    {c.label}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {c.description}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {/* Condition Value Inputs */}
          <div className="pt-2">
            {condition === 'price_below_target' || condition === 'price_reaches_target' ? (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Alert me when price reaches or goes below (₹):
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 50000"
                  className="input-box font-mono"
                />
              </div>
            ) : condition === 'price_in_range' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Min Price (₹)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="45000"
                    className="input-box font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Price (₹)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="52000"
                    className="input-box font-mono"
                  />
                </div>
              </div>
            ) : condition === 'discount_reaches_percent' ? (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Discount Threshold (%):
                </label>
                <input
                  type="number"
                  value={discountThreshold}
                  onChange={(e) => setDiscountThreshold(e.target.value)}
                  placeholder="20"
                  className="input-box font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Price Drop Threshold (%):
                </label>
                <input
                  type="number"
                  value={priceDropPercent}
                  onChange={(e) => setPriceDropPercent(e.target.value)}
                  placeholder="10"
                  className="input-box font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/6">
            <button
              onClick={() => setCurrentStep(1)}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4"
            >
              Continue to Step 3 <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Monitoring & Channels ── */}
      {currentStep === 3 && (
        <div className="panel p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap size={17} className="text-purple-400" />
              Step 3: Autonomous Monitoring & Alerts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Set check frequency and select notification dispatch channels.
            </p>
          </div>

          {/* Check Interval */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Autonomous Scan Frequency:
            </label>
            <select
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value))}
              className="input-box text-xs"
            >
              <option value={1}>Every 1 minute (Recommended for competition demo)</option>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
            </select>
          </div>

          {/* Notification Preference Checkboxes */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Notification Delivery Channels:
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl subpanel cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBrowser}
                onChange={(e) => setNotifyBrowser(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600"
              />
              <div>
                <span className="text-xs font-medium text-white block">Instant Browser Push Notifications</span>
                <span className="text-[11px] text-slate-500">HTML5 Web Notifications API triggered on desktop</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl subpanel cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600"
              />
              <div>
                <span className="text-xs font-medium text-white block">Email Dispatch (SMTP)</span>
                <span className="text-[11px] text-slate-500">Automated dispatch via configured SMTP credentials</span>
              </div>
            </label>
          </div>

          {/* Demo Mode Toggle */}
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-950/15 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-300 block">Demo Simulation Mode</span>
              <span className="text-[11px] text-slate-400">
                Uses DummyJSON with stepwise price simulation (Ideal for judges demonstration)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDemoMode(!demoMode)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                demoMode ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  demoMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/6">
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4"
            >
              Review & Launch <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & Launch ── */}
      {currentStep === 4 && (
        <div className="panel p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles size={17} className="text-purple-400" />
              Step 4: Review & Launch
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Confirm your locked product identity, threshold logic, and autonomous parameters.
            </p>
          </div>

          {/* Summary Card */}
          <div className="p-4 rounded-xl subpanel space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Locked Product</span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {selectedProduct?.name || productName}
                </h3>
                {selectedProduct && (
                  <span className="chip chip-purple text-[10px] mt-1.5">
                    <Lock size={10} /> Identity Locked ({Math.round(selectedProduct.match_score * 100)}% match)
                  </span>
                )}
              </div>
              <span className="text-base font-mono font-bold text-emerald-400">
                {selectedProduct ? fmtPrice(selectedProduct.price) : 'Auto-detected'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/6 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Condition Threshold</span>
                <span className="text-white font-medium capitalize mt-0.5 block">
                  {condition.replace(/_/g, ' ')}
                  {targetPrice ? ` @ ₹${parseInt(targetPrice).toLocaleString('en-IN')}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Interval</span>
                <span className="text-white font-medium mt-0.5 block">
                  Every {checkInterval} minute{checkInterval > 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Channels</span>
                <span className="text-white font-medium mt-0.5 block">
                  {notifyBrowser ? 'Browser Push' : ''} {notifyEmail ? '+ Email' : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Environment</span>
                <span className="text-cyan-400 font-medium mt-0.5 block">
                  {demoMode ? '🎮 Demo Simulation' : '🌐 Live Web Scraping'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Perception Button & Output */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-purple-300 block">Dry Run Verification</span>
              <span className="text-[11px] text-slate-400">Test agent perception and quote matching before launching</span>
            </div>
            <button
              type="button"
              onClick={handleTestPerception}
              disabled={isTesting}
              className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto flex items-center gap-1.5"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin text-purple-400" /> : <Bot size={13} />}
              <span>{isTesting ? 'Testing...' : 'Test Perception'}</span>
            </button>
          </div>

          {testResult && (
            <div className="p-3 rounded-lg bg-black/40 border border-white/6 font-mono text-xs text-slate-300">
              {testResult}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-white/6">
            <button
              onClick={() => setCurrentStep(3)}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 text-xs py-2.5 px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Launching Agent...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>START MONITORING</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
