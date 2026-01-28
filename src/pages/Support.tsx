import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

const Support = () => {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Support</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10 pt-6">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Need help?</p>
            <h1 className="text-3xl font-semibold">We are here to help.</h1>
            <p className="text-base text-muted-foreground">
              For questions, feedback, or feature requests, the best place to reach me is my
              portfolio.
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <IonButton
              href="https://jdbjerrekaer.github.io/portfolio/"
              target="_blank"
              rel="noreferrer"
            >
              Visit portfolio
            </IonButton>
            <span className="text-sm text-muted-foreground">
              You will find contact options and project details there.
            </span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Support;
