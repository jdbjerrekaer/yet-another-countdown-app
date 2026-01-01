import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from "@ionic/react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Not Found</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <div className="flex min-h-full items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold">404</h1>
            <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
            <IonButton routerLink="/" routerDirection="root">
              Return to Home
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NotFound;
