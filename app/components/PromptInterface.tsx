"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Code2, Rocket, AlertCircle, CheckCircle } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { GenerationRequest, GenerationResponse } from "@/app/types/generation";
import GenerationResult from "./GenerationResult";
import { useAuth } from "@/app/contexts/AuthContext";
import SignInModal from "@/app/components/auth/SignInModal";
import { FiUser, FiLogOut } from "react-icons/fi";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PromptInterface() {
  const [prompt, setPrompt] = useState(
    "Create a modern task management app with user authentication"
  );
  const [selectedModel, setSelectedModel] = useState<
    "claude" | "gpt4" | "gpt3.5" | "gemini-flash" | "gemini-pro"
  >("gpt3.5");
  const [appType, setAppType] = useState<"web" | "mobile">("web");
  const [includeBackend, setIncludeBackend] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generationResult, setGenerationResult] =
    useState<GenerationResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setError("");
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const request: GenerationRequest = {
        prompt,
        model: selectedModel,
        appType,
        includeBackend,
      };

      // Prepare headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add auth token if user is logged in
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (tokenError) {
          console.error("Failed to get auth token:", tokenError);
        }
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      const result: GenerationResponse = await response.json();

      if (!user) {
        setShowSignIn(true);
        toast.error("Please sign in to generate code");
        return;
      }

      if (!result?.success) {
        if (response.status === 401) {
          setShowSignIn(true);
          throw new Error("Please sign in to generate code");
        } else if (response.status === 402) {
          throw new Error("Insufficient credits. Please upgrade your plan.");
        }
        throw new Error(result?.error || "Generation failed");
      }

      setGenerationResult(result);
      setShowResult(true);
      console.log("Generation successful:", result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      console.error("Generation error:", err);
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // If we have results, show the result component
  if (showResult && generationResult?.data?.code) {
    return (
      <>
        <button
          onClick={() => setShowResult(false)}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
        >
          ← Back to Generator
        </button>
        <GenerationResult
          code={generationResult.data.code}
          projectName="generated-app"
          appType={appType}
          hasBackend={includeBackend}
          model={selectedModel}
        />
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto p-6"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="fixed top-0 right-0 p-4 z-50 flex items-center space-x-4">
          {user ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 glass-morphism rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-2"
              >
                <FiUser className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowSignIn(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Sign In
            </button>
          )}
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-morphism mb-4"
        >
          <Code2 className="w-10 h-10 text-purple-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          AI Code Generator
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-300 text-lg"
        >
          Transform your ideas into production-ready applications
        </motion.p>
      </div>

      {/* Main Interface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="glass-morphism rounded-2xl p-8 glow-effect"
      >
        {/* Prompt Input */}
        <div className="mb-6">
          <label className="block text-white mb-2 font-medium">
            <Sparkles className="inline w-4 h-4 mr-2" />
            Describe your application
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Create a social media dashboard with real-time analytics..."
            className="w-full h-32 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
          />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-red-400 text-sm flex items-center"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Model Selector */}
          <div>
            <label className="block text-white mb-2 font-medium text-sm">
              AI Model
            </label>

            <Select.Root
              value={selectedModel}
              onValueChange={(value) =>
                setSelectedModel(value as typeof selectedModel)
              }
            >
              <Select.Trigger className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-between hover:bg-white/15 transition-colors text-sm">
                <Select.Value />
                <Select.Icon>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M2.5 4.5L6 8L9.5 4.5" />
                  </svg>
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content className="bg-slate-800 rounded-xl border border-white/20 shadow-xl overflow-hidden">
                  <Select.Viewport>
                    <Select.Item
                      value="gpt3.5"
                      className="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer transition-colors text-sm"
                    >
                      <Select.ItemText>
                        GPT-3.5 Turbo (Fast)
                      </Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="gpt4"
                      className="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer transition-colors text-sm"
                    >
                      <Select.ItemText>GPT-4o (Advanced)</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="claude"
                      className="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer transition-colors text-sm"
                    >
                      <Select.ItemText>Claude 3.5 Sonnet</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="gemini-flash"
                      className="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer transition-colors text-sm"
                    >
                      <Select.ItemText>
                        Gemini 1.5 Flash (Fast)
                      </Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="gemini-pro"
                      className="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer transition-colors text-sm"
                    >
                      <Select.ItemText>Gemini 1.5 Pro</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* App Type Selector */}
          <div>
            <label className="block text-white mb-2 font-medium text-sm">
              Application Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAppType("web")}
                className={`flex-1 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  appType === "web"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                }`}
              >
                Web
              </button>
              <button
                type="button"
                onClick={() => setAppType("mobile")}
                className={`flex-1 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  appType === "mobile"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          {/* Backend Toggle */}
          <div>
            <label className="block text-white mb-2 font-medium text-sm">
              Backend
            </label>
            <button
              type="button"
              onClick={() => setIncludeBackend(!includeBackend)}
              className={`w-full px-3 py-2.5 rounded-lg transition-all flex items-center justify-center text-sm font-medium ${
                includeBackend
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
              }`}
            >
              {includeBackend ? "✓ Firebase" : "Frontend Only"}
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center space-x-2 ${
            isGenerating
              ? "bg-gradient-to-r from-purple-600/50 to-pink-600/50 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
          }`}
        >
          {isGenerating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              <span>Generate Application</span>
            </>
          )}
        </motion.button>

        {/* Success Message */}
        {generationResult?.success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 flex items-center"
          >
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Code generated successfully!</p>
              <p className="text-sm opacity-90">
                Files created:{" "}
                {generationResult.data?.code?.files.length || 0} files
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Feature Pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex flex-wrap justify-center gap-3"
      >
        {[
          "Responsive Design",
          "TypeScript",
          "Tailwind CSS",
          "Production Ready",
          "Clean Code",
          "Best Practices",
        ].map((feature, index) => (
          <motion.span
            key={feature}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm backdrop-blur-sm"
          >
            ✨ {feature}
          </motion.span>
        ))}
      </motion.div>

      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </motion.div>
  );
}
