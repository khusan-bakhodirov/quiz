import data from "./data/quiz.json";
class CustomHTMLElement extends HTMLElement {
  constructor() {
    super();
  }
  showLoadingBar() {
    triggerEvent(document.documentElement, "theme:loading:start");
  }
  hideLoadingBar() {
    triggerEvent(document.documentElement, "theme:loading:end");
  }
  untilVisible(
    intersectionObserverOptions = { rootMargin: "30px 0px", threshold: 0 }
  ) {
    const onBecameVisible = () => {
      this.classList.add("became-visible");
      this.style.opacity = "1";
    };
    return new Promise((resolve) => {
      if (window.IntersectionObserver) {
        this.intersectionObserver = new IntersectionObserver((event) => {
          if (event[0].isIntersecting) {
            this.intersectionObserver.disconnect();
            requestAnimationFrame(() => {
              resolve();
              onBecameVisible();
            });
          }
        }, intersectionObserverOptions);
        this.intersectionObserver.observe(this);
      } else {
        resolve();
        onBecameVisible();
      }
    });
  }
}

class CustomAnimation {
  constructor(effect) {
    this._effect = effect;
    this._playState = "idle";
    this._finished = Promise.resolve();
  }
  get finished() {
    return this._finished;
  }
  get animationEffects() {
    return this._effect instanceof CustomKeyframeEffect
      ? [this._effect]
      : this._effect.animationEffects;
  }
  cancel() {
    this.animationEffects.forEach((animationEffect) =>
      animationEffect.cancel()
    );
  }
  finish() {
    this.animationEffects.forEach((animationEffect) =>
      animationEffect.finish()
    );
  }
  play() {
    this._playState = "running";
    this._effect.play();
    this._finished = this._effect.finished;
    this._finished.then(
      () => {
        this._playState = "finished";
      },
      (rejection) => {
        this._playState = "idle";
      }
    );
  }
}
class CustomKeyframeEffect {
  constructor(target, keyframes, options = {}) {
    if (!target) {
      return;
    }
    if ("Animation" in window) {
      this._animation = new Animation(
        new KeyframeEffect(target, keyframes, options)
      );
    } else {
      options["fill"] = "forwards";
      this._animation = target.animate(keyframes, options);
      this._animation.pause();
    }
    this._animation.addEventListener("finish", () => {
      target.style.opacity = keyframes.hasOwnProperty("opacity")
        ? keyframes["opacity"][keyframes["opacity"].length - 1]
        : null;
      target.style.visibility = keyframes.hasOwnProperty("visibility")
        ? keyframes["visibility"][keyframes["visibility"].length - 1]
        : null;
    });
  }
  get finished() {
    if (!this._animation) {
      return Promise.resolve();
    }
    return this._animation.finished
      ? this._animation.finished
      : new Promise((resolve) => (this._animation.onfinish = resolve));
  }
  play() {
    if (this._animation) {
      this._animation.startTime = null;
      this._animation.play();
    }
  }
  cancel() {
    if (this._animation) {
      this._animation.cancel();
    }
  }
  finish() {
    if (this._animation) {
      this._animation.finish();
    }
  }
}

class WelcomePage extends CustomHTMLElement {
  connectedCallback() {
    this.welcome_title = this.querySelector(".welcome-title");
    this.welcome_description = this.querySelector(".welcome-description");
    this.welcome_btn = this.querySelector(".btn");
    this.description_container = this.querySelector(".description-container");
    this.welcome_title.textContent = data.welcomePage.title;
    this.welcome_description.textContent = data.welcomePage.description;
    this.welcome_btn.textContent = data.welcomePage.buttonText;

    this.transitionToEnter();
  }

  transitionToEnter() {
    const elements = [
      this.welcome_title,
      this.description_container,
      this.welcome_btn,
    ];
    elements.forEach((element, i) => {
      element.style.opacity = 0;
      const animation = new CustomAnimation(
        new CustomKeyframeEffect(
          element,
          {
            opacity: [0, 1],
            transform: ["translateX(100px)", "translateX(0)"],
          },
          { duration: 400, delay: i * 200, fill: "forwards" }
        )
      );
      animation.play();
    });
  }
}

window.customElements.define("welcome-page", WelcomePage);

class SurveyPage extends CustomHTMLElement {
  connectedCallback() {
    this.answers = JSON.parse(localStorage.getItem("answers")) || [];
    this.currentQuestion = this.answers.length >= 1 ? this.answers.length - 1: 0;
    this.selectedOption = this.answers[this.currentQuestion] || null;
    this.survey_title = this.querySelector(".survey-title");
    this.survey_question = this.querySelector(".survey-question");
    this.survey_options_container = this.querySelector(".survey-options");
    this.next_btn = this.querySelector(".next");
    this.prev_btn = this.querySelector(".prev");
    this.finish_btn =  this.querySelector(".finish");
    this.steps_container = this.querySelector(".steps");
    this.createSteps();
    this.setAnsweredSteps();
    this.showCurrentQuestion();

    this.survey_title.textContent = data.surveyName;
    this.survey_options_container.addEventListener("click", (event) => {
      if (
        event.target.classList.contains("survey-option") &&
        !event.target.closest("expandable-button")
      ) {
        this.selectOption(event.target.textContent);
      }
    });

    this.steps_container.addEventListener("click", (event) => {
      if (event.target.classList.contains("step")) {
        this.selectQuestion(parseInt(event.target.textContent) - 1);
      }
    });

    this.prev_btn.addEventListener("click", this.prevQuestion.bind(this));
    this.next_btn.addEventListener("click", this.handleContinueBtn.bind(this));

    document.addEventListener(
      "answer:changed",
      this.handleAnswerChange.bind(this)
    );
    document.addEventListener(
      "next:disabled",
      this.handleNextDisabled.bind(this)
    );
    document.addEventListener(
      "next:enabled",
      this.handleNextEnabled.bind(this)
    );
  }

  showCurrentQuestion() {
    const question = data.steps[this.currentQuestion];
    this.survey_question.textContent = question.question;
    this.next_btn.setAttribute("disabled", true);
    this.createOptions(question);
    this.setActiveStep();
    this.EnableDisablePrevButton();
    this.transtionToEnter();
    if (this.selectedOption) {
      this.selectOption(this.selectedOption);
    }
  }

  async nextQuestion() {
    await this.transitionToLeave();
    this.currentQuestion++;
    this.selectedOption = this.answers[this.currentQuestion];
    if (this.selectOption) this.selectOption(this.selectedOption);
    this.showCurrentQuestion();
    this.setAnsweredSteps();
  }
  async prevQuestion() {
    if (this.currentQuestion <= 0) return;
    await this.transitionToLeave();
    this.currentQuestion--;
    this.selectedOption = this.answers[this.currentQuestion];
    this.showCurrentQuestion();
    this.setAnsweredSteps();
  }

  async selectQuestion(index) {
    if (this.answers.length < index) return;
    await this.transitionToLeave();
    this.currentQuestion = index;
    this.selectedOption = this.answers[index];
    this.showCurrentQuestion();
  }
  createSteps() {
    const steps = data.steps.map((step) => {
      const stepElement = document.createElement("div");
      stepElement.className = "step";
      stepElement.textContent = step.stepNumber;
      return stepElement;
    });
    this.steps = steps;
    this.steps_container.innerHTML = "";
    steps.forEach((step) => {
      this.steps_container.appendChild(step);
    });
  }
  setActiveStep() {
    this.steps.forEach((step) => {
      step.classList.remove("active");
    });
    this.steps[this.currentQuestion].classList.add("active");
  }
  setAnsweredSteps() {
    this.steps.forEach((step, index) => {
      if (index + 1 <= this.answers.length) {
        step.classList.add("selected");
      }
    });
    console.log(this.answers);
  }
  createOptions(question) {
    const options = question.options.map((option, index) => {
      if (question.hasOtherOption && index === question.options.length - 1) {
        const expandableButton = document.createElement("expandable-button");
        expandableButton.className = "expandable-button";
        const optionElement = document.createElement("div");
        optionElement.className = "survey-option";
        optionElement.textContent = option;
        const otherOptionInput = document.createElement("input");
        otherOptionInput.type = "text";
        otherOptionInput.placeholder = "Other";
        otherOptionInput.className = "survey-other-option";
        expandableButton.appendChild(optionElement);
        expandableButton.appendChild(otherOptionInput);

        return expandableButton;
      } else {
        const optionElement = document.createElement("div");
        optionElement.className = "survey-option";
        optionElement.textContent = option;
        return optionElement;
      }
    });
    this.survey_options = options;
    this.survey_options_container.innerHTML = "";
    options.forEach((option) => {
      this.survey_options_container.appendChild(option);
    });
  }

  selectOption(option) {
    // close expandable button if it is open
    const event = new CustomEvent("expandable-button:close");
    document.dispatchEvent(event);
    this.selectedOption = option;
    if (
      this.survey_options.some(
        (option) => option.textContent === this.selectedOption
      )
    ) {
      this.survey_options.forEach((option) => {
        if (option.textContent === this.selectedOption) {
          option.classList.add("selected");
        } else {
          option.classList.remove("selected");
        }
      });
    } else {
      const event = new CustomEvent("expandable-button:open", {
        detail: this.selectedOption,
      });
      document.dispatchEvent(event);
    }
    this.next_btn.removeAttribute("disabled"); 
  }

  handleContinueBtn() {

    // if user come back to previous question and select new answer
    if (this.answers[this.currentQuestion]) {
      this.answers[this.currentQuestion] = this.selectedOption;
    } else {
      this.answers.push(this.selectedOption);
      this.selectedOption = null;
    }
    localStorage.setItem('answers', JSON.stringify(this.answers));
    if(this.currentQuestion === data.steps.length - 1){
      this.finish_btn.removeAttribute("disabled");
      this.finish_btn.classList.add("active");
      this.next_btn.setAttribute("disabled", true);
    }
    if (this.currentQuestion < data.steps.length - 1) {
      this.nextQuestion();
    }
  }
  EnableDisablePrevButton() {
    if (this.currentQuestion === 0) {
      this.prev_btn.setAttribute("disabled", true);
    } else {
      this.prev_btn.removeAttribute("disabled");
    }
  }

  handleNextDisabled() {
    this.next_btn.setAttribute("disabled", true);
    this.selectedOption = null;
    this.survey_options.forEach((option) => {
      option.classList.remove("selected");
    });
  }
  handleNextEnabled() {
    this.next_btn.removeAttribute("disabled");
  }
  handleAnswerChange(e) {
    this.selectedOption = e.detail;
  }
  transtionToEnter() {
    const elements = [this.survey_question, this.survey_options_container];
    elements.forEach((element, i) => {
      element.style.opacity = 0;
      const animation = new CustomAnimation(
        new CustomKeyframeEffect(
          element,
          {
            opacity: [0, 1],
            transform: ["translateX(100px)", "translateX(0)"],
          },
          { duration: 400, delay: i * 200, fill: "forwards" }
        )
      );
      animation.play();
    });
  }

  transitionToLeave() {
    const elements = [this.survey_question, this.survey_options_container];

    let result = elements.map((element, i) => {
      element.style.opacity = 1;
      const animation = new CustomAnimation(
        new CustomKeyframeEffect(
          element,
          {
            opacity: [1, 0],
            transform: ["translateX(0)", "translateX(-100px)"],
          },
          { duration: 400, delay: i * 200, fill: "forwards" }
        )
      );
      animation.play();
      return animation.finished;
    });

    return Promise.all(result);
  }
}

window.customElements.define("survey-page", SurveyPage);

class expandableButton extends CustomHTMLElement {
  connectedCallback() {
    this.character_limit = 200;
    this.input = this.querySelector("input");
    this.option = this.querySelector(".survey-option");
    this.input.addEventListener("input", this.handleInputChange.bind(this));
    this.option.addEventListener("click", this.handleButtonExpand.bind(this));
    document.addEventListener(
      "expandable-button:open",
      this.handleButtonOpen.bind(this)
    );
    document.addEventListener(
      "expandable-button:close",
      this.handleButtonClose.bind(this)
    );
  }

  handleInputChange() {
    if (this.input.value != "") {
      const event = new CustomEvent("next:enabled");
      document.dispatchEvent(event);
      const answer_event = new CustomEvent("answer:changed", {
        detail: this.input.value,
      });
      document.dispatchEvent(answer_event);
    }
    if (
      this.input.value.length > this.character_limit ||
      this.input.value === ""
    ) {
      const event = new CustomEvent("next:disabled");
      document.dispatchEvent(event);
    }
  }
  handleButtonExpand() {
    this.setAttribute("expanded", "true");
    const event = new CustomEvent("next:disabled");
    document.dispatchEvent(event);
  }
  handleButtonClose() {
    this.removeAttribute("expanded");
    const event = new CustomEvent("next:disabled");
    document.dispatchEvent(event);
  }

  handleButtonOpen(e) {
    this.input.value = e.detail;
    this.setAttribute("expanded", "true");
  }
}

window.customElements.define("expandable-button", expandableButton);
