import { motion } from 'framer-motion';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { APP_NAME, APP_TAGLINE, BrandMark } from './brand';

export const Greeting = () => {
  const { greeting } = useAppConfig();
  return (
    <div
      key="overview"
      className="mx-auto mb-8 flex size-full max-w-3xl flex-col items-center justify-center px-4 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex flex-col items-center gap-3"
      >
        <BrandMark size={44} />
        <h1 className="font-extrabold text-3xl text-foreground tracking-[0.12em] md:text-4xl">
          RISK <span className="text-brand">AI</span> NAVIGATOR
        </h1>
        <span className="sr-only">{APP_NAME}</span>
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
          <span className="h-px w-6 bg-brand/50" />
          {APP_TAGLINE}
          <span className="h-px w-6 bg-brand/50" />
        </div>
        <p className="mt-2 text-base text-muted-foreground md:text-lg">
          {greeting}
        </p>
      </motion.div>
    </div>
  );
};
