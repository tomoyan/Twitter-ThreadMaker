/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Link as LinkIcon, 
  Sparkles, 
  Twitter, 
  Copy, 
  Check, 
  Loader2, 
  ArrowRight, 
  AlertCircle, 
  Image as ImageIcon, 
  RefreshCw, 
  Table 
} from 'lucide-react';
import { processUrl, generateImage, ThreadResult, Tweet } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ThreadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await processUrl(url);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSingleImage = async (index: number) => {
    if (!result) return;
    const tweet = result.thread[index];
    if (!tweet.imagePrompt) return;

    const newThread = [...result.thread];
    try {
      const imageData = await generateImage(tweet.imagePrompt);
      newThread[index] = { ...tweet, imageData };
      setResult({ ...result, thread: newThread });
    } catch (e) {
      console.error("Single image generation failed", e);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyForSheets = () => {
    if (!result) return;
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    // Format: DateTime \t 1st Text \t ImageURL \t ID \t ... up to 7th
    // TSV uses tabs (\t) which is better for pasting into Sheets without quoting issues
    const columns = [dateTimeStr];
    
    for (let i = 0; i < 7; i++) {
      const tweet = result.thread[i];
      if (tweet) {
        // For TSV, we just need to make sure there are no tabs in the text
        const cleanText = tweet.text.replace(/\t/g, ' ').replace(/\n/g, ' ');
        // Prioritize article image URL over generated base64 data for the "URL" column
        const imageUrl = tweet.articleImageUrl || tweet.imageData || '';
        columns.push(cleanText, imageUrl, ''); // ID is blank
      } else {
        columns.push('', '', ''); // Empty columns if fewer than 7 tweets
      }
    }
    
    const tsvRow = columns.join('\t');
    navigator.clipboard.writeText(tsvRow);
    setCopiedIndex(-2); // Special index for sheets copy
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900">スレまとめ</span>
          </div>
          <div className="text-sm text-zinc-500 font-medium hidden sm:block">
            URLからTwitterスレッドを数秒で作成
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4"
          >
            リンクを<span className="text-indigo-600">バズるスレッド</span>に変換。
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-zinc-600 max-w-xl mx-auto"
          >
            URLを貼り付けるだけで、AIが内容を要約し、最適なTwitterスレッドを作成します。
          </motion.p>
        </div>

        {/* Input Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="relative mb-12"
        >
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <LinkIcon className="w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="url"
              required
              placeholder="https://example.com/article-to-summarize"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-12 pr-32 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-zinc-900 placeholder:text-zinc-400"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-2 bottom-2 px-6 bg-zinc-900 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  生成する
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </motion.form>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-zinc-900 font-semibold">内容を分析中...</p>
                <p className="text-zinc-500 text-sm">Geminiがページを読み込み、スレッドを作成しています。</p>
              </div>
            </motion.div>
          )}

          {result && !isLoading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Thread Section */}
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Twitter className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900">Twitterスレッド</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={copyForSheets}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-700 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
                    >
                      {copiedIndex === -2 ? (
                        <>
                          <Check className="w-4 h-4" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Table className="w-4 h-4" />
                          Sheets形式でコピー
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {result.thread.map((tweet, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:border-indigo-200 transition-all"
                    >
                      <div className="p-6">
                        <p className="text-zinc-800 leading-relaxed whitespace-pre-wrap pr-10 mb-4">
                          {tweet.text}
                        </p>
                        
                        {(tweet.articleImageUrl || tweet.imageData) ? (
                          <div className="relative rounded-xl overflow-hidden mb-4 border border-zinc-100">
                            <img 
                              src={tweet.articleImageUrl || tweet.imageData} 
                              alt={`Tweet ${index + 1} visual`}
                              className="w-full aspect-video object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => handleGenerateSingleImage(index)}
                              className="absolute bottom-2 right-2 p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all"
                              title="画像を再生成"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            {tweet.articleImageUrl && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-white/80 backdrop-blur-sm text-[10px] font-bold text-zinc-600 rounded uppercase tracking-wider">
                                Article Image
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateSingleImage(index)}
                            className="w-full py-8 border-2 border-dashed border-zinc-100 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all mb-4"
                          >
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-xs font-medium">画像を生成する</span>
                          </button>
                        )}

                        <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                          <span>{tweet.text.length} 文字</span>
                          <span className="text-indigo-500/60 uppercase tracking-wider">Tweet {index + 1}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(tweet.text, index)}
                        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="ツイートをコピー"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-zinc-200 mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>© 2024 スレまとめ. Powered by Gemini.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-zinc-900 transition-colors">プライバシー</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">利用規約</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">フィードバック</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
