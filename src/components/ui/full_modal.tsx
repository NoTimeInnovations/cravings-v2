"use client"

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const FullModal = DialogPrimitive.Root;

const FullModalTrigger = DialogPrimitive.Trigger;

const FullModalPortal = DialogPrimitive.Portal;

const FullModalClose = DialogPrimitive.Close;

const FullModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
FullModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

const FullModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
  }
>(({ className, children, showCloseButton = true, ...props }, ref) => (
  <FullModalPortal>
    <FullModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 flex flex-col w-full h-full bg-background shadow-lg',
        'overflow-y-auto',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-bottom-0 data-[state=open]:slide-in-from-bottom-0',
        'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
        className
      )}
      {...props}
    >
      {showCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-muted z-20">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
      {children}
    </DialogPrimitive.Content>
  </FullModalPortal>
));
FullModalContent.displayName = "FullModalContent";

const FullModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 px-6 py-4 border-b sticky top-0 bg-background z-10',
      className
    )}
    {...props}
  />
);
FullModalHeader.displayName = 'FullModalHeader';

const FullModalBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex-1 p-6 pb-[100px]',
      className
    )}
    {...props}
  />
);
FullModalBody.displayName = 'FullModalBody';

const FullModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t px-6 py-4 bg-background z-20',
      'fixed left-0 right-0',
      'bottom-0',
      'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
      'transition-all duration-200 ease-in-out',
      className
    )}
    {...props}
  />
);
FullModalFooter.displayName = 'FullModalFooter';

const FullModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
FullModalTitle.displayName = DialogPrimitive.Title.displayName;

const FullModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
FullModalDescription.displayName = DialogPrimitive.Description.displayName;

export {
  FullModal,
  FullModalPortal,
  FullModalOverlay,
  FullModalTrigger,
  FullModalClose,
  FullModalContent,
  FullModalHeader,
  FullModalBody,
  FullModalFooter,
  FullModalTitle,
  FullModalDescription,
}; 