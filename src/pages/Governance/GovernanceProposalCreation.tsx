import { TokenAmount, JSBI, Token } from '@uniswap/sdk'
import React, { useCallback, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { X } from 'react-feather'
import styled from 'styled-components'
import { makeStyles } from '@material-ui/core/styles'
import Stepper from '@material-ui/core/Stepper'
import Step from '@material-ui/core/Step'
import StepButton from '@material-ui/core/StepButton'
import useTheme from 'hooks/useTheme'
import { RowBetween } from 'components/Row'
import { ButtonEmpty, ButtonPrimary, ButtonOutlinedPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'theme'
import TextInput from 'components/TextInput'
import { useTokenBalance } from 'state/wallet/hooks'
import TransactionConfirmationModal from 'components/TransactionConfirmationModal'
import { SubmittedView } from 'components/ModalViews'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useApproveCallback } from 'hooks/useApproveCallback'
import { tryParseAmount } from 'state/swap/hooks'
import { useGovernanceCreation } from 'hooks/useGovernanceDetail'
import StaticOverlay from 'components/Modal/StaticOverlay'

const Wrapper = styled.div`
  width: 920px;
  border:1px solid ${({ theme }) => theme.bg3}
  margin-bottom: auto;
  max-width: 1280px;
  border-radius: 32px; 
  padding: 29px 52px;
  display: flex;
  flex-direction: column;
  jusitfy-content: cetner;
  align-items: center;
  margin: 30px 0;
  & > form {
    width: 100%;
  };
  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 0 24px;
    width: 100%;
  `};
  ${({ theme }) => theme.mediaWidth.upToLarge`
  margin-bottom: 70px;
  `};
`

const Warning = styled.div`
  background-color: ${({ theme }) => theme.red1};
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  margin: 30px 0;
  text-align: center;
`

const ModalButtonWrapper = styled(RowBetween)`
  margin-top: 14px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  flex-direction: column;
  & > *:last-child {
    margin-top: 12px;
  };
  & > *:first-child {
    margin: 0;
  }
`}
`

const stakeAmount = 200

const fields = {
  title: 'Title',
  details: 'Details',
  summary: 'Summary',
  agreeFor: 'For',
  againstFor: 'Against'
}

const testCoin = '0x6669ee1e6612e1b43eac84d4cb9a94af0a98e740'

export default function GovernanceProposalCreation({
  onDismiss,
  isOpen
}: {
  onDismiss: (e: React.SyntheticEvent) => void
  isOpen: boolean
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [input, setInput] = useState<any>({ title: '', summary: '', agreeFor: '', againstFor: '' })
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const theme = useTheme()

  const governanceCreateCallback = useGovernanceCreation()
  const addTransaction = useTransactionAdder()
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string>('')
  const { chainId, account } = useWeb3React()

  const balance: TokenAmount | undefined = useTokenBalance(
    account ?? undefined,
    chainId ? new Token(chainId, testCoin, 18) : undefined
  )
  const notEnoughBalance = !balance?.greaterThan(JSBI.BigInt(stakeAmount))

  const [approval, approveCallback] = useApproveCallback(
    tryParseAmount(JSBI.BigInt(stakeAmount).toString(), chainId ? new Token(chainId, testCoin, 18) : undefined),
    chainId ? testCoin : undefined
  )

  const handleApprove = useCallback(
    async (callback: () => void) => {
      await approveCallback()
      callback()
    },
    [approveCallback]
  )

  const handleStep = (step: number) => () => {
    setActiveStep(step)
  }

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    setTxHash('')
  }, [])

  const handleSubmit = useCallback(e => {
    e.preventDefault()
    const formData = new FormData(e.target).entries()
    const input: { [key: string]: any } = {}
    let error = ''
    for (const pair of formData) {
      if (!pair[1]) {
        error += ', ' + fields[pair[0] as keyof typeof fields]
      }
      input[pair[0]] = pair[1]
    }
    setError(error ? 'Following fields are incomplete:' + error.slice(1) : '')

    if (!error) {
      setShowConfirm(true)
      setInput(input)
    }
  }, [])

  const onCreate = useCallback(async () => {
    if (!governanceCreateCallback) return
    if (!approval) {
      handleApprove(onCreate)
      return
    }

    const args = [
      input.title,
      `{"summary":"${input.summary}","details":"${input.details}","agreeFor":"${input.agreeFor}","againstFor":"${input.againstFor}"}`,
      JSBI.BigInt(activeStep + 3).toString(),
      JSBI.BigInt(stakeAmount).toString()
    ]

    setAttemptingTxn(true)

    const res = governanceCreateCallback(args)
    res
      .then(response => {
        setAttemptingTxn(false)
        setInput({ title: '', summary: '', agreeFor: '', againstFor: '' })
        addTransaction(response, {
          summary: 'Create proposal "' + input.title + '"'
        })
        setTxHash(response.hash)
      })
      .catch(error => {
        setAttemptingTxn(false)
        setTxHash('error')
        if (error?.code !== 4001) {
          setSubmitError(error)
          console.error('---->', error)
        }
      })
  }, [activeStep, addTransaction, approval, governanceCreateCallback, handleApprove, input])

  return (
    <>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        content={() => <ConfirmationModalContent onDismiss={handleDismissConfirmation} onConfirm={onCreate} />}
        pendingText={'Waiting For Confirmation...'}
        submittedContent={() => (
          <SubmittedModalContent onDismiss={handleDismissConfirmation} hash={txHash} isError={!!submitError} />
        )}
      />
      <StaticOverlay isOpen={isOpen}>
        <Wrapper>
          <form name="GovernanceCreationForm" id="GovernanceCreationForm" onSubmit={handleSubmit}>
            <AutoColumn gap="36px">
              <RowBetween>
                <TYPE.largeHeader>Create a New Proposal</TYPE.largeHeader>
                <ButtonEmpty width="auto" padding="0" onClick={onDismiss}>
                  <X color={theme.text3} size={24} />
                </ButtonEmpty>
              </RowBetween>
              <TYPE.smallHeader fontSize={22}>Proposal Description</TYPE.smallHeader>
              <TextInput
                label={fields.title}
                placeholder="Enter your project name (Keep it Below 10 words)"
                disabled={notEnoughBalance}
                name="title"
              ></TextInput>
              <TextInput
                label={fields.summary}
                placeholder="What will be done if the proposal is implement (Keep it below 200 words)"
                textarea
                name="summary"
                disabled={notEnoughBalance}
              ></TextInput>
              <TextInput
                label={fields.details}
                placeholder="Write a Longer motivation with links and references if necessary"
                disabled={notEnoughBalance}
                name="details"
              ></TextInput>
              <TYPE.smallHeader fontSize={22}>Proposal Settings</TYPE.smallHeader>
              <TextInput
                label={fields.agreeFor}
                placeholder="Formulate clear for position"
                disabled={notEnoughBalance}
                name="agreeFor"
              ></TextInput>
              <TextInput
                label={fields.againstFor}
                placeholder="Formulate clear Against position"
                disabled={notEnoughBalance}
                name="againstFor"
              ></TextInput>
              <TYPE.smallHeader fontSize={22}>Proposal Timing</TYPE.smallHeader>
              <TYPE.darkGray>Please set a time frame for the proposal. Select the number of days below</TYPE.darkGray>
              <GovernanceTimeline activeStep={activeStep} onStep={handleStep} disabled={notEnoughBalance} />
              {error && <TYPE.body color={theme.red1}>{error}</TYPE.body>}
              <ButtonPrimary type="submit" disabled={notEnoughBalance} style={{ maxWidth: 416, margin: '0 auto' }}>
                Determine
              </ButtonPrimary>
            </AutoColumn>
          </form>
          {notEnoughBalance && <Warning>You must have {stakeAmount + 100000} MATTER to create a proposal</Warning>}
        </Wrapper>
      </StaticOverlay>
    </>
  )
}

function GovernanceTimeline({
  activeStep,
  onStep,
  disabled
}: {
  activeStep: number
  onStep: (step: number) => () => void
  disabled: boolean
}) {
  const theme = useTheme()

  const useStyles = useCallback(
    () =>
      makeStyles({
        root: {
          width: '100%',
          '& .MuiPaper-root': {
            backgroundColor: 'transparent'
          },
          '& text': {
            stroke: 'transparent',
            fill: 'transparent'
          },
          '& path': {
            stroke: 'transparent',
            fill: 'transparent'
          }
        },
        step: {
          '& svg': {
            overflow: 'visible'
          },
          '& circle': {
            fill: theme.bg5
          },
          '& .MuiStepLabel-label': {
            color: theme.text4,
            fontSize: 16
          },
          '& .MuiStepIcon-active circle': {
            fill: theme.primary1,
            stroke: theme.primary4,
            strokeWidth: 4
          },
          '& .MuiStepLabel-active': {
            color: theme.text1,
            fontWeight: 500
          },
          '& .MuiStepConnector-root': {
            left: 'calc(-50% + 10px)',
            right: 'calc(50% + 11px)'
          },
          '& .MuiStepButton-root': {
            zIndex: 2
          }
        }
      }),
    [theme]
  )
  const classes = useStyles()()

  return (
    <div className={classes.root}>
      <Stepper alternativeLabel nonLinear activeStep={activeStep}>
        {[3, 4, 5, 6, 7].map((label, index) => {
          return (
            <Step key={label} active={activeStep === index} className={classes.step} disabled={disabled}>
              <StepButton onClick={onStep(index)}>{label}days</StepButton>
            </Step>
          )
        })}
      </Stepper>
      <div></div>
    </div>
  )
}

function ConfirmationModalContent({ onDismiss, onConfirm }: { onDismiss: () => void; onConfirm: () => any }) {
  const theme = useTheme()
  return (
    <AutoColumn justify="center" style={{ padding: 24, width: '100%' }} gap="20px">
      <RowBetween>
        <div style={{ width: 24 }} />
        <ButtonEmpty width="auto" padding="0" onClick={onDismiss}>
          <X color={theme.text3} size={24} />
        </ButtonEmpty>
      </RowBetween>

      <TYPE.body fontSize={16}>
        You will stack 200 MATTER
        <br /> to submit this proposal
      </TYPE.body>
      <ModalButtonWrapper>
        <ButtonOutlinedPrimary marginRight="15px" onClick={onDismiss}>
          Cancel
        </ButtonOutlinedPrimary>
        <ButtonPrimary onClick={onConfirm}>Confirm</ButtonPrimary>
      </ModalButtonWrapper>
    </AutoColumn>
  )
}

function SubmittedModalContent({
  onDismiss,
  hash,
  isError
}: {
  onDismiss: () => void
  hash: string | undefined
  isError?: boolean
}) {
  return (
    <>
      <SubmittedView onDismiss={onDismiss} hash={hash} hideLink isError={isError}>
        <TYPE.body fontWeight={400} fontSize={18} textAlign="center">
          {isError ? (
            <>
              There is a unexpected error, <br /> please try again
            </>
          ) : (
            <>
              You have successfully
              <br /> created an proposal
            </>
          )}
        </TYPE.body>
      </SubmittedView>
    </>
  )
}
