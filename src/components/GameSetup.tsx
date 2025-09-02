import React from 'react';
import styled from 'styled-components';
import { Player } from './Gomoku3DBoard';

interface GameSetupProps {
  onPlayerSelection: (humanPlayer: Player) => void;
  theme: {
    background: string;
    text: string;
    cardBackground: string;
    buttonBackground: string;
    buttonText: string;
    buttonHover: string;
  };
}

const SetupContainer = styled.div<{ theme: any }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
`;

const SetupCard = styled.div<{ theme: any }>`
  background: ${props => props.theme.cardBackground};
  border-radius: 20px;
  padding: 3rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  text-align: center;
  max-width: 500px;
  width: 100%;
`;

const Title = styled.h1<{ theme: any }>`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${props => props.theme.text};
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Subtitle = styled.p<{ theme: any }>`
  font-size: 1.2rem;
  margin-bottom: 3rem;
  color: ${props => props.theme.text};
  opacity: 0.8;
  line-height: 1.5;
`;

const ColorOptions = styled.div`
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 2rem;
`;

const ColorButton = styled.button<{ theme: any }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: ${props => props.theme.cardBackground};
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    border-color: ${props => props.theme.buttonBackground};
  }
  
  &:active {
    transform: translateY(-2px);
  }
`;

const StonePreview = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  &.black {
    background: linear-gradient(135deg, #23242b 0%, #3a3a5a 100%);
    box-shadow: 
      0 8px 20px rgba(35, 36, 43, 0.6),
      inset 0 4px 8px rgba(255, 255, 255, 0.15),
      inset 0 -4px 8px rgba(0, 0, 0, 0.2);
  }
  
  &.white {
    background: linear-gradient(135deg, #ffffff 0%, #f7f6f2 100%);
    box-shadow: 
      0 8px 20px rgba(0, 0, 0, 0.3),
      inset 0 4px 8px rgba(255, 255, 255, 0.8),
      inset 0 -4px 8px rgba(0, 0, 0, 0.1);
    border: 2px solid rgba(0, 0, 0, 0.1);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 20%;
    left: 30%;
    width: 40%;
    height: 40%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    filter: blur(4px);
  }
`;

const ColorLabel = styled.div<{ theme: any }>`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const ColorDescription = styled.div<{ theme: any }>`
  font-size: 0.9rem;
  color: ${props => props.theme.text};
  opacity: 0.7;
  text-align: center;
  line-height: 1.3;
`;

const GameInfo = styled.div<{ theme: any }>`
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  border: 1px solid rgba(255,255,255,0.1);
`;

const InfoTitle = styled.h3<{ theme: any }>`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
  color: ${props => props.theme.text};
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
`;

const InfoItem = styled.li<{ theme: any }>`
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  opacity: 0.8;
  margin-bottom: 0.5rem;
  padding-left: 1.2rem;
  position: relative;
  
  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: ${props => props.theme.buttonBackground};
    font-weight: bold;
  }
`;

export const GameSetup: React.FC<GameSetupProps> = ({ onPlayerSelection, theme }) => {
  return (
    <SetupContainer theme={theme}>
      <SetupCard theme={theme}>
        <Title theme={theme}>3D Gomoku vs AI</Title>
        <Subtitle theme={theme}>
          Choose your color to begin the battle of minds in three dimensions
        </Subtitle>
        
        <ColorOptions>
          <ColorButton 
            theme={theme}
            onClick={() => onPlayerSelection(1)}
            title="Play as Black - You go first!"
          >
            <StonePreview className="black" />
            <ColorLabel theme={theme}>Black</ColorLabel>
            <ColorDescription theme={theme}>
              You move first<br/>
              Strategic advantage
            </ColorDescription>
          </ColorButton>
          
          <ColorButton 
            theme={theme}
            onClick={() => onPlayerSelection(2)}
            title="Play as White - AI goes first!"
          >
            <StonePreview className="white" />
            <ColorLabel theme={theme}>White</ColorLabel>
            <ColorDescription theme={theme}>
              AI moves first<br/>
              Reactive play
            </ColorDescription>
          </ColorButton>
        </ColorOptions>
        
        <GameInfo theme={theme}>
          <InfoTitle theme={theme}>Game Rules</InfoTitle>
          <InfoList>
            <InfoItem theme={theme}>Get 5 stones in a row to win (any direction in 3D)</InfoItem>
            <InfoItem theme={theme}>No six-in-a-row allowed (forbidden move)</InfoItem>
            <InfoItem theme={theme}>Open 3-3 patterns are permitted</InfoItem>
            <InfoItem theme={theme}>AI thinks for 0.5 seconds per move</InfoItem>
          </InfoList>
        </GameInfo>
      </SetupCard>
    </SetupContainer>
  );
};
