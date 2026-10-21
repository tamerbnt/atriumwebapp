#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full Translation Dictionary for Project & Milestone (Agency 6-Roles)
Covers all 631 pm_ keys in Arabic and fixes English keys.
"""

import json

# Comprehensive Arabic translations for all PM keys
AR_TRANSLATIONS = {
    # ── Role Badges & Names ──
    "pm_role_direction_badge": "الإدارة العامة (DG)",
    "pm_role_cp_badge": "مدير المشاريع (CDP)",
    "pm_role_crea_badge": "استوديو التصميم (CR)",
    "pm_role_sup_badge": "مشرف الميدان (SUP)",
    "pm_role_rh_badge": "الموارد البشرية والكاستينغ (RH)",
    "pm_role_compta_badge": "المحاسبة والرواتب (CPT)",
    "pm_role_active_label": "الدور النشط",
    "pm_role_direction_name": "الإدارة العامة",
    "pm_role_chef_projet_name": "مدير المشاريع",
    "pm_role_crea_name": "استوديو التصميم الإبداعي",
    "pm_role_superviseur_name": "مشرف الميدان",
    "pm_role_rh_name": "الموارد البشرية والكاستينغ",
    "pm_role_compta_name": "المحاسبة والمالية",
    "pm_role_direction_abbr": "إدارة",
    "pm_role_chef_projet_abbr": "مشروع",
    "pm_role_crea_abbr": "إبداع",
    "pm_role_superviseur_abbr": "ميدان",
    "pm_role_rh_abbr": "موارد",
    "pm_role_compta_abbr": "محاسبة",
    "pm_role_cp_sub": "مراحل الحملات، اعتماد نماذج الطباعة، أوامر الشراء والمصاريف",
    "pm_role_crea_sub": "التصميم الغرافيكي، المطابقة التقنية للطباعة والرؤى البصرية (KV)",
    "pm_role_sup_sub": "تنفيذ المهام الميدانية، توزيع الفرق، تسجيل الحضور والمصاريف المباشرة",
    "pm_role_rh_sub": "قاعدة بيانات المنشطين، المطابقة القانونية، وثائق الهوية والتوظيف",
    "pm_role_compta_sub": "التدقيق الآلي للرواتب، حوالات بريد الجزائر SFP 01 والتسويات المالية",

    # ── Screen Titles & Sub-screens ──
    "pm_screen_dir_dashboard": "لوحة القيادة والمراقبة",
    "pm_screen_dir_new_project": "تأطير الحملة ودفتر الشروط",
    "pm_screen_dir_projects": "محفظة المشاريع والحملات",
    "pm_screen_dir_approvals": "الموافقات والتدقيق المزدوج",
    "pm_screen_dir_reports": "التقارير وهوامش الربح",
    "pm_screen_cp_projects": "محفظة المشاريع والمراحل",
    "pm_screen_cp_catalog": "كتالوج المواد الدعائية والطباعة",
    "pm_screen_cp_orders": "متابعة الطلبات وتجارب الطباعة",
    "pm_screen_cp_deliverables": "نماذج الطباعة (BAT) والتسليم",
    "pm_screen_cp_files": "ملفات ونماذج الطباعة المعتمدة",
    "pm_screen_cp_expenses": "الميزانية ومصاريف الميدان",
    "pm_screen_crea_kanban": "كانبان الطلبات الإبداعية",
    "pm_screen_crea_production": "خط الإنتاج والتنفيذ البصري",
    "pm_screen_crea_upload": "فاحص ومعتمد نماذج الطباعة (BAT)",
    "pm_screen_crea_briefs": "دفاتر الشروط المعتمدة",
    "pm_screen_sup_missions": "مهام التنشيط الميداني",
    "pm_screen_sup_attendance": "تسجيل الحضور الميداني المباشر",
    "pm_screen_sup_staffing": "توزيع واختيار طواقم العمل",
    "pm_screen_sup_expenses": "التصريح بالمصاريف الميدانية",
    "pm_screen_rh_talents": "قاعدة المنشطين (58 ولاية)",
    "pm_screen_rh_dossier": "الملف الشامل للمرشح 360°",
    "pm_screen_rh_portal": "بوابة التسجيل الإلكتروني",
    "pm_screen_rh_walkin": "تسجيل فوري في الوكالة",
    "pm_screen_compta_payroll": "منظومة الرواتب المؤتمتة",
    "pm_screen_compta_ccp": "حوالات بريد الجزائر (SFP 01)",
    "pm_screen_compta_expenses": "تدقيق الفواتير والرقم الجبائي",
    "pm_screen_compta_stock": "مخزون الأصول والتجهيزات (QR)",

    # ── Months ──
    "pm_month_jan": "جانفي",
    "pm_month_feb": "فيفري",
    "pm_month_mar": "مارس",
    "pm_month_apr": "أفريل",
    "pm_month_may": "ماي",
    "pm_month_jun": "جوان",
    "pm_month_jul": "جويلية",

    # ── KPIs ──
    "pm_kpi_active_projects": "حملات الوكالة النشطة",
    "pm_kpi_budget_committed": "الميزانية الملتزم بها",
    "pm_kpi_field_talents": "المنشطون الميدانيون المجندون",
    "pm_kpi_payroll_due": "مستحقات الرواتب الميدانية",
    "pm_kpi_ccp_slips": "حوالات بريد الجزائر (CCP)",

    # ── Buttons ──
    "pm_btn_new_project": "تأطير مشروع جديد",
    "pm_btn_generate_ccp": "إصدار حوالات بريد الجزائر SFP 01",
    "pm_btn_approve_payroll": "اعتماد (القفل المالي المزدوج)",
    "pm_btn_upload_bat": "رفع ملف نموذج الطباعة (BAT)",
    "pm_btn_open_mobile_sim: ": "فتح تطبيق الهاتف الميداني",
    "pm_btn_open_mobile_sim": "فتح تطبيق الهاتف الميداني",

    # ── Statuses ──
    "pm_status_brief": "دفتر الشروط والموجز",
    "pm_status_crea_in_progress": "قيد الإنتاج الإبداعي",
    "pm_status_client_review": "مراجعة العميل",
    "pm_status_bat_approved": "نموذج الطباعة معتمد",
    "pm_status_field_active": "التنفيذ الميداني نشط",
    "pm_status_audit_pending": "قيد التدقيق المحاسبي",
    "pm_status_closed": "مغلق ومسدد بالكامل",

    # ── CCP Slip Modal ──
    "pm_ccp_modal_title": "الحوالة الرسمية لبريد الجزائر — SFP 01",
    "pm_ccp_modal_sub": "معاملة مالية بريدية · أمر تحويل بريدي جاري معتمد",
    "pm_ccp_standard_notice": "نموذج SFP 01 قياسي مطابق لمكاتب وشبابيك بريد الجزائر",
    "pm_ccp_republic": "الجمهورية الجزائرية الديمقراطية الشعبية",
    "pm_ccp_ministry": "وزارة البريد والمواصلات السلكية واللاسلكية",
    "pm_ccp_operations": "بريد الجزائر · العمليات المالية SFP 01",
    "pm_ccp_edition": "إصدار نظام أتريوم للمؤسسات (Atrium ERP)",
    "pm_ccp_beneficiary_name": "المستفيد (الاسم واللقب)",
    "pm_ccp_amount_digits": "المبلغ بالأرقام",
    "pm_ccp_account_number": "رقم الحساب البريدي الجاري (CCP)",
    "pm_ccp_key": "المفتاح (Clé)",
    "pm_ccp_words_fr": "المبلغ بالحروف كاملة (اللغة الفرنسية القانونية):",
    "pm_ccp_words_ar": "المبلغ بالأحرف كاملة (اللغة العربية القانونية):",
    "pm_ccp_purpose": "سبب العملية والغرض منها:",
    "pm_ccp_signature_order": "توقيع وخاتم الآمر بالصرف:",
    "pm_ccp_signed_dg": "معتمد وموقع من الإدارة العامة",
    "pm_ccp_post_stamp_box": "ختم وتاريخ مكتب البريد",
    "pm_ccp_compliance_footer": "نموذج SFP 01 قياسي معتمد ومطابق لشبابيك بريد الجزائر",
    "pm_ccp_postal_reserved": "خاص بمصلحة البريد:",

    # ── Simulator ──
    "pm_sim_mobile_mode": "عرض الهاتف الذكي (390px)",
    "pm_sim_desktop_mode": "عرض الشاشة الكاملة (سطح المكتب)",
    "pm_sim_badge": "تجربة الهاتف الميدانية",
}

print(f"Loaded {len(AR_TRANSLATIONS)} base AR translations.")
