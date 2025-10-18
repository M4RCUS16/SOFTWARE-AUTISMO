import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { MainLayout } from '@/layouts/main-layout';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { PatientsPage } from '@/pages/patients';
import { PatientDetailPage } from '@/pages/patient-detail';
import { AssessmentsPage } from '@/pages/assessments';
import { DiagnosticAssessmentPage } from '@/pages/diagnostic-assessment';
import { InterventionsPage } from '@/pages/interventions';
import { ReportsPage } from '@/pages/reports';
import { ResourcesPage } from '@/pages/resources';
import { SettingsPage } from '@/pages/settings';
import { HelpPage } from '@/pages/help';
import { ProtectedRoute } from './protected-route';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:patientId" element={<PatientDetailPage />} />
          <Route path="/assessments" element={<AssessmentsPage />} />
          <Route path="/diagnostic" element={<DiagnosticAssessmentPage />} />
          <Route path="/interventions" element={<InterventionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
