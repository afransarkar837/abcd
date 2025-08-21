import AnimatedBackground from './components/AnimatedBackground';
import PromptInterface from './components/PromptInterface';

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      <PromptInterface />
    </main>
  );
}