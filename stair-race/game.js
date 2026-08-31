const state = {
  level: 1,
  stairTarget: 6,
  stairLocked: false,
  raceStart: 4,
  currentNumber: 4,
  raceProgress: 0,
  raceLocked: false,
  soundOn: true,
};

const elements = {
  shell: document.querySelector("#game-shell"),
  message: document.querySelector("#message"),
  levelOne: document.querySelector("#level-one"),
  levelTwo: document.querySelector("#level-two"),
  levelDotOne: document.querySelector("#level-dot-1"),
  levelDotTwo: document.querySelector("#level-dot-2"),
  stairTarget: document.querySelector("#stair-target"),
  climberNumber: document.querySelector("#climber-number"),
  climber: document.querySelector("#climber"),
  stairScroll: document.querySelector("#stair-scroll"),
  stairs: [...document.querySelectorAll(".stair")],
  nextLevel: document.querySelector("#next-level"),
  carTarget: document.querySelector("#car-target"),
  runnerNumber: document.querySelector("#runner-number"),
  runner: document.querySelector("#road-runner"),
  road: document.querySelector(".road"),
  choicePrompt: document.querySelector("#choice-prompt"),
  carChoices: document.querySelector("#car-choices"),
  resultDialog: document.querySelector("#result-dialog"),
  playAgain: document.querySelector("#play-again"),
  soundButton: document.querySelector("#sound-button"),
  soundLabel: document.querySelector("#sound-label"),
};

let audioContext;

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function setMessage(text, type = "") {
  elements.message.textContent = text;
  elements.message.className = `message${type ? ` is-${type}` : ""}`;
}

function playTone(kind) {
  if (!state.soundOn) return;

  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  audioContext ||= new AudioEngine();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const tones = kind === "success" ? [523, 659] : [220, 165];

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(tones[0], now);
  oscillator.frequency.setValueAtTime(tones[1], now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.31);
}

function burstAt(element) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bounds = element.getBoundingClientRect();
  const burst = document.createElement("span");
  burst.className = "star-burst";
  burst.style.left = `${bounds.left + bounds.width / 2 - 12}px`;
  burst.style.top = `${bounds.top + bounds.height / 2 - 12}px`;
  document.body.append(burst);
  burst.addEventListener("animationend", () => burst.remove(), { once: true });
}

function setStairButtons(disabled, stateName = "") {
  elements.stairs.forEach((stair) => {
    stair.disabled = disabled;
    stair.dataset.state = stateName;
  });
}

function moveClimberTo(stair) {
  const stairX = stair.offsetLeft + stair.offsetWidth / 2 - elements.climber.offsetWidth / 2;
  const stairY = -(stair.offsetHeight - elements.climber.offsetHeight * 0.2);
  elements.climber.style.setProperty("--climb-x", `${stairX}px`);
  elements.climber.style.setProperty("--climb-y", `${stairY}px`);
}

function resetClimber() {
  elements.climber.style.setProperty("--climb-x", "0px");
  elements.climber.style.setProperty("--climb-y", "0px");
  elements.climber.classList.remove("is-happy");
}

function handleStairChoice(event) {
  if (state.stairLocked) return;

  const stair = event.currentTarget;
  const picked = Number(stair.dataset.step);
  state.stairLocked = true;
  setStairButtons(true, "loading");
  moveClimberTo(stair);

  if (picked === state.stairTarget) {
    window.setTimeout(() => {
      stair.dataset.state = "success";
      elements.climber.classList.add("is-happy");
      setMessage(`对啦！你是 ${state.stairTarget}，刚好停在第 ${picked} 格。`, "success");
      playTone("success");
      burstAt(stair);
      elements.nextLevel.hidden = false;
      elements.nextLevel.focus({ preventScroll: true });
    }, 580);
    return;
  }

  window.setTimeout(() => {
    stair.dataset.state = "error";
    setMessage(`这是第 ${picked} 格，不是 ${state.stairTarget}。回到下面再试一次！`, "error");
    playTone("error");
  }, 580);

  window.setTimeout(() => {
    resetClimber();
    state.stairLocked = false;
    setStairButtons(false);
  }, 1250);
}

function makeRaceChoices() {
  const remainingAfterChoice = 2 - state.raceProgress;
  const maximumCorrect = 9 - remainingAfterChoice;
  const correct = randomInteger(state.currentNumber + 1, maximumCorrect);
  const lowerNumbers = shuffled(
    Array.from({ length: state.currentNumber }, (_, index) => index + 1),
  ).slice(0, 2);
  const choices = shuffled([correct, ...lowerNumbers]);

  elements.choicePrompt.innerHTML = `哪辆小车的数字比 <strong>${state.currentNumber}</strong> 大？`;
  elements.carChoices.replaceChildren();

  choices.forEach((number) => {
    const button = document.createElement("button");
    button.className = "car-choice";
    button.type = "button";
    button.dataset.number = String(number);
    button.setAttribute("aria-label", `${number} 号小车`);
    button.textContent = String(number);
    button.addEventListener("click", handleCarChoice);
    elements.carChoices.append(button);
  });
}

function setCarButtons(disabled, stateName = "") {
  elements.carChoices.querySelectorAll(".car-choice").forEach((button) => {
    button.disabled = disabled;
    button.dataset.state = stateName;
  });
}

function updateRunner() {
  const finishX = Math.max(0, elements.road.clientWidth - elements.runner.offsetWidth - 18);
  const runnerX = (finishX * state.raceProgress) / 3 + 9;
  elements.runner.style.setProperty("--runner-x", `${runnerX}px`);
  elements.carTarget.textContent = state.currentNumber;
  elements.runnerNumber.textContent = state.currentNumber;
}

function handleCarChoice(event) {
  if (state.raceLocked) return;

  const button = event.currentTarget;
  const picked = Number(button.dataset.number);
  state.raceLocked = true;
  setCarButtons(true, "loading");

  if (picked > state.currentNumber) {
    state.currentNumber = picked;
    state.raceProgress += 1;
    updateRunner();
    elements.runner.classList.add("is-success");

    window.setTimeout(() => {
      button.dataset.state = "success";
      playTone("success");
      burstAt(button);

      if (state.raceProgress === 3) {
        setMessage(`太棒了！${picked} 比前一个数字大，你顺利到达终点。`, "success");
        window.setTimeout(showResult, 650);
        return;
      }

      setMessage(`选对了！${picked} 更大，小车向前开了一段。`, "success");
      state.raceLocked = false;
      elements.runner.classList.remove("is-success");
      makeRaceChoices();
    }, 580);
    return;
  }

  button.dataset.state = "error";
  elements.runner.classList.add("is-error");
  setMessage(`${picked} 没有比 ${state.currentNumber} 大，小车要回起点了。`, "error");
  playTone("error");

  window.setTimeout(() => {
    state.currentNumber = state.raceStart;
    state.raceProgress = 0;
    updateRunner();
  }, 500);

  window.setTimeout(() => {
    state.raceLocked = false;
    elements.runner.classList.remove("is-error");
    setMessage(`已经回到起点。现在从 ${state.raceStart} 开始，选一个更大的数字。`);
    makeRaceChoices();
  }, 1100);
}

function startLevelTwo() {
  state.level = 2;
  state.raceStart = randomInteger(2, 5);
  state.currentNumber = state.raceStart;
  state.raceProgress = 0;
  state.raceLocked = false;
  elements.levelOne.hidden = true;
  elements.levelTwo.hidden = false;
  elements.levelDotOne.classList.remove("is-current");
  elements.levelDotOne.classList.add("is-done");
  elements.levelDotOne.removeAttribute("aria-current");
  elements.levelDotTwo.classList.add("is-current");
  elements.levelDotTwo.setAttribute("aria-current", "step");
  updateRunner();
  makeRaceChoices();
  setMessage(`你现在是 ${state.currentNumber}。选一辆数字更大的车，向终点前进！`);
  elements.levelTwo.querySelector(".car-choice").focus({ preventScroll: true });
}

function showResult() {
  elements.levelDotTwo.classList.remove("is-current");
  elements.levelDotTwo.classList.add("is-done");
  elements.levelDotTwo.removeAttribute("aria-current");
  elements.shell.inert = true;
  elements.resultDialog.showModal();
  elements.playAgain.focus();
}

function resetGame() {
  if (elements.resultDialog.open) elements.resultDialog.close();
  elements.shell.inert = false;
  state.level = 1;
  state.stairTarget = randomInteger(1, 9);
  state.stairLocked = false;
  state.raceLocked = false;
  state.raceProgress = 0;
  elements.stairTarget.textContent = state.stairTarget;
  elements.climberNumber.textContent = state.stairTarget;
  elements.levelOne.hidden = false;
  elements.levelTwo.hidden = true;
  elements.nextLevel.hidden = true;
  elements.levelDotOne.className = "level-dot is-current";
  elements.levelDotOne.setAttribute("aria-current", "step");
  elements.levelDotTwo.className = "level-dot";
  elements.levelDotTwo.removeAttribute("aria-current");
  resetClimber();
  setStairButtons(false);
  setMessage(`你是 ${state.stairTarget}，请爬到第 ${state.stairTarget} 格。`);

  requestAnimationFrame(() => {
    const targetStair = elements.stairs[state.stairTarget - 1];
    const desiredLeft = targetStair.offsetLeft - elements.stairScroll.clientWidth / 2 + targetStair.offsetWidth / 2;
    elements.stairScroll.scrollTo({ left: Math.max(0, desiredLeft), behavior: "smooth" });
  });
}

elements.stairs.forEach((stair) => stair.addEventListener("click", handleStairChoice));
elements.nextLevel.addEventListener("click", startLevelTwo);
elements.playAgain.addEventListener("click", resetGame);
elements.soundButton.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  elements.soundButton.setAttribute("aria-pressed", String(state.soundOn));
  elements.soundLabel.textContent = state.soundOn ? "声音开" : "声音关";
  if (state.soundOn) playTone("success");
});
elements.resultDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  resetGame();
});
elements.resultDialog.addEventListener("click", (event) => {
  if (event.target === elements.resultDialog) resetGame();
});
window.addEventListener("resize", () => {
  if (state.level === 2) updateRunner();
});

resetGame();
