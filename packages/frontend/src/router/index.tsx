import React, { Suspense } from "react";
import { Route, Routes } from "react-router";
import { AuthProvider } from "../contexts/AuthContext";
import { EinsatzProvider } from "../contexts/EinsatzContext";
import EinsatzGuard from "./auth/EinsatzGuard";
import PrivateRoute from "./auth/PrivateRoute";

// App Layout
const AppLayout = React.lazy(() => import("@templates/AppLayout"));

// Dashboard Layout
const DashboardLayout = React.lazy(() => import("@templates/DashboardLayout"));

// Index Page
const IndexPage = React.lazy(() => import("@pages/page"));

// Login Page
const LoginPage = React.lazy(() => import("@pages/login/page"));

// Dashboard
const DashboardPage = React.lazy(() => import("@/components/pages/app/dashboard/page"));
const ETBDashboardPage = React.lazy(() => import("@/components/pages/dashboard/etb/page"));

// Einsätze
const EinsaetzeUebersichtPage = React.lazy(() => import("@/components/pages/app/einsaetze/page"));

// Einsatz
const EinsatztagebuchPage = React.lazy(() => import("@pages/app/einsatztagebuch/page"));
const ChecklistenPage = React.lazy(() => import("@pages/app/checklisten/page"));
const RemindersPage = React.lazy(() => import("@pages/app/reminders/page"));
const KräftePage = React.lazy(() => import("@pages/app/kräfte/page"));
const FahrzeugePage = React.lazy(() => import("@pages/app/fahrzeuge/page"));
const EinsatzkräftePage = React.lazy(() => import("@pages/app/einsatzkräfte/page"));
const RollenPage = React.lazy(() => import("@pages/app/rollen/page"));

// Betroffene
const BetroffenePage = React.lazy(() => import("@pages/app/betroffene/page"));
const AufnehmenPage = React.lazy(() => import("@pages/app/betroffene/aufnehmen/page"));
const VerwaltenPage = React.lazy(() => import("@pages/app/betroffene/verwalten/page"));
const ManvPage = React.lazy(() => import("@pages/app/betroffene/manv/page"));

// Anforderungen
const AnforderungenPage = React.lazy(() => import("@pages/app/anforderungen/page"));

// Lagekarte
const LagekartePage = React.lazy(() => import("@pages/app/lagekarte/page"));
const LetzteEintraegePage = React.lazy(() => import("@pages/app/lagekarte/letzte-eintraege/page"));
const DwdWetterkartePage = React.lazy(() => import("@pages/app/lagekarte/dwd-wetterkarte/page"));

// UAV
const UavPage = React.lazy(() => import("@pages/app/uav/page"));
const FlugaufträgePage = React.lazy(() => import("@pages/app/uav/flugaufträge/page"));
const FlugzonenPage = React.lazy(() => import("@pages/app/uav/flugzonen/page"));
const RoutenPage = React.lazy(() => import("@pages/app/uav/routen/page"));
const WetterPage = React.lazy(() => import("@pages/app/uav/wetter/page"));
const StreamPage = React.lazy(() => import("@pages/app/uav/stream/page"));
const TelemetriePage = React.lazy(() => import("@pages/app/uav/telemetrie/page"));
const ProtokollPage = React.lazy(() => import("@pages/app/uav/protokoll/page"));
const BerichtPage = React.lazy(() => import("@pages/app/uav/bericht/page"));

// Kommunikation & Funk
const KanallistePage = React.lazy(() => import("@pages/app/kanalliste/page"));
const KommunikationsverzeichnisPage = React.lazy(() => import("@pages/app/kommunikationsverzeichnis/page"));
const FmsPage = React.lazy(() => import("@pages/app/fms/page"));

// Einsatzinformationen
const EinsatzdatenPage = React.lazy(() => import("@pages/app/einsatzdaten/page"));
const EinsatzabschnittePage = React.lazy(() => import("@pages/app/einsatzabschnitte/page"));
const SchadenPage = React.lazy(() => import("@pages/app/schaden/page"));
const GefahrenPage = React.lazy(() => import("@pages/app/gefahren/page"));
const NotizenPage = React.lazy(() => import("@pages/app/notizen/page"));

// Einsatz Management
const CreateInitialEinsatzPage = React.lazy(() => import("@/components/pages/app/CreateInitialEinsatz"));

// Admin Pages
const AdminGuard = React.lazy(() => import("@/components/organisms/admin/AdminGuard"));
const AdminDashboardPage = React.lazy(() => import("@/components/pages/app/admin/page"));
const AdminUsersPage = React.lazy(() => import("@/components/pages/app/admin/users/page"));
const AdminOrganizationsPage = React.lazy(() => import("@/components/pages/app/admin/organizations/page"));
const AdminSystemPage = React.lazy(() => import("@/components/pages/app/admin/system/page"));
const AdminLogsPage = React.lazy(() => import("@/components/pages/app/admin/logs/page"));

// NotFound Page
const NotFoundPage = React.lazy(() => import("@/components/pages/not-found/page"));

// Loading component for Suspense
const Loading = () => <div className="p-6 text-center">Lädt...</div>;

// Router Configuration
export const Router = () => {
    return (
        <AuthProvider>
            <EinsatzProvider>
                <Suspense fallback={<Loading />}>
                    <Routes>
                    {/* Öffentliche Routen */}
                    <Route path="/" element={<IndexPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Dashboard Routes */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/dashboard" element={<DashboardLayout />}>
                            <Route path="etb" element={<ETBDashboardPage />} />
                        </Route>
                    </Route>

                    {/* Geschützte Routen */}
                    <Route element={<PrivateRoute />}>
                        <Route element={<EinsatzGuard />}>
                            <Route path="/app" element={<AppLayout />}>
                            <Route index element={<DashboardPage />} />

                            {/* Einsatz */}
                            <Route path="einsatztagebuch" element={<EinsatztagebuchPage />} />
                            <Route path="checklisten" element={<ChecklistenPage />} />
                            <Route path="reminders" element={<RemindersPage />} />
                            <Route path="kräfte" element={<KräftePage />} />
                            <Route path="fahrzeuge" element={<FahrzeugePage />} />
                            <Route path="einsatzkräfte" element={<EinsatzkräftePage />} />
                            <Route path="rollen" element={<RollenPage />} />

                            {/* Betroffene */}
                            <Route path="betroffene">
                                <Route index element={<BetroffenePage />} />
                                <Route path="aufnehmen" element={<AufnehmenPage />} />
                                <Route path="verwalten" element={<VerwaltenPage />} />
                                <Route path="manv" element={<ManvPage />} />
                            </Route>

                            {/* Anforderungen */}
                            <Route path="anforderungen" element={<AnforderungenPage />} />

                            {/* Lagekarte */}
                            <Route path="lagekarte">
                                <Route index element={<LagekartePage />} />
                                <Route path="letzte-eintraege" element={<LetzteEintraegePage />} />
                                <Route path="dwd-wetterkarte" element={<DwdWetterkartePage />} />
                            </Route>

                            {/* UAV */}
                            <Route path="uav">
                                <Route index element={<UavPage />} />
                                <Route path="flugaufträge" element={<FlugaufträgePage />} />
                                <Route path="flugzonen" element={<FlugzonenPage />} />
                                <Route path="routen" element={<RoutenPage />} />
                                <Route path="wetter" element={<WetterPage />} />
                                <Route path="stream" element={<StreamPage />} />
                                <Route path="telemetrie" element={<TelemetriePage />} />
                                <Route path="protokoll" element={<ProtokollPage />} />
                                <Route path="bericht" element={<BerichtPage />} />
                            </Route>

                            {/* Kommunikation & Funk */}
                            <Route path="kanalliste" element={<KanallistePage />} />
                            <Route path="kommunikationsverzeichnis" element={<KommunikationsverzeichnisPage />} />
                            <Route path="fms" element={<FmsPage />} />

                            {/* Einsatzinformationen */}
                            <Route path="einsatzdaten" element={<EinsatzdatenPage />} />
                            <Route path="einsatzabschnitte" element={<EinsatzabschnittePage />} />
                            <Route path="schaden" element={<SchadenPage />} />
                            <Route path="gefahren" element={<GefahrenPage />} />
                            <Route path="notizen" element={<NotizenPage />} />

                            {/* Admin Routes - geschützt durch AdminGuard */}
                            <Route element={<AdminGuard />}>
                                <Route path="admin" element={<AdminDashboardPage />} />
                                <Route path="admin/users" element={<AdminUsersPage />} />
                                <Route path="admin/organizations" element={<AdminOrganizationsPage />} />
                                <Route path="admin/system" element={<AdminSystemPage />} />
                                <Route path="admin/logs" element={<AdminLogsPage />} />
                            </Route>
                            </Route>

                            {/* Standalone Einsatz Management - außerhalb AppLayout */}
                            <Route path="/app/create-initial-einsatz" element={<CreateInitialEinsatzPage />} />
                            <Route path="/app/einsaetze" element={<EinsaetzeUebersichtPage />} />
                        </Route>
                    </Route>

                    {/* 404 - Not Found Route */}
                    <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </EinsatzProvider>
        </AuthProvider>
    );
}; 