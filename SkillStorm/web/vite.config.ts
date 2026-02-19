import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'game-engines': [
            './src/games/PhysicsEngine.ts',
            './src/games/AISystem.ts',
            './src/games/RenderEffects.ts',
            './src/games/AchievementSystem.ts',
            './src/games/GameUtils.ts',
            './src/games/SoundEngine.ts',
          ],
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
