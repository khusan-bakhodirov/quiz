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
    this.welcome_description = this.querySelector('.welcome-description');
    this.welcome_btn = this.querySelector('.btn');
    this.description_container = this.querySelector('.description-container');
    this.welcome_title.textContent = data.welcomePage.title;
    this.welcome_description.textContent = data.welcomePage.description;
    this.welcome_btn.textContent = data.welcomePage.buttonText;

    this.transitionToEnter();
  }

  transitionToEnter() {
    const elements = [this.welcome_title, this.description_container, this.welcome_btn];
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
    })
  }
}

window.customElements.define("welcome-page", WelcomePage);
