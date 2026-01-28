import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

const PrivacyPolicy = () => {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Privacy Policy</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10 pt-6">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Last updated: Jan 28, 2026
            </p>
            <h1 className="text-3xl font-semibold">Your privacy, kept simple.</h1>
            <p className="text-base text-muted-foreground">
              We do not collect, store, or sell your personal information. Your countdowns stay on
              your device.
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">What we collect</h2>
            <p className="text-muted-foreground">
              Nothing. We do not collect personal data, location data, or usage analytics.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Data stored on your device</h2>
            <p className="text-muted-foreground">
              Your countdowns and settings are stored locally on your device so the app can work
              offline.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Changes to this policy</h2>
            <p className="text-muted-foreground">
              If the app ever needs to collect data in the future, this policy will be updated
              before any changes take effect.
            </p>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicy;
