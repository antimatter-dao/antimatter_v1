import React from 'react'
import { useTransition } from 'react-spring'
import useTheme from 'hooks/useTheme'
import { StyledDialogOverlay } from '.'

export default function StaticOverlay({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  const theme = useTheme()
  const fadeTransition = useTransition(isOpen, null, {
    config: { duration: 200 },
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 }
  })
  return (
    <>
      {fadeTransition.map(
        ({ item, key, props }) =>
          item && (
            <StyledDialogOverlay
              key={key}
              style={props}
              color={theme.bg1}
              unstable_lockFocusAcrossFrames={false}
              overflow="auto"
              alignitems="flex-start"
            >
              {children}
            </StyledDialogOverlay>
          )
      )}
    </>
  )
}
