"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

interface FormSectionProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function FormSection({ children, index = 0, className = "" }: FormSectionProps) {
  return (
    <motion.div
      custom={index}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SuccessCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedSuccessCard({ children, className = "" }: SuccessCardProps) {
  return (
    <motion.div
      variants={successVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}
