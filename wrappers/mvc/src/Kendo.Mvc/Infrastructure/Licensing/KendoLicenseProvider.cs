﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;

namespace Kendo.Mvc.Infrastructure.Licensing
{
    class KendoLicenseProvider : LicenseProvider
    {
        private readonly static object lockObject;

        private readonly static IDictionary<Type, KendoLicense> licenseDictionary;

        static KendoLicenseProvider()
        {
            KendoLicenseProvider.lockObject = new object();
            KendoLicenseProvider.licenseDictionary = new Dictionary<Type, KendoLicense>();
        }

        public override License GetLicense(LicenseContext context, Type type, object instance, bool allowExceptions)
        {
            return KendoLicenseProvider.Validate(type, instance);
        }

        internal static KendoLicense Validate(Type type, object instance)
        {
            KendoLicense license;

            if (!KendoLicenseProvider.licenseDictionary.TryGetValue(type, out license))
            {
                lock (KendoLicenseProvider.lockObject)
                {
                    if (!KendoLicenseProvider.licenseDictionary.TryGetValue(type, out license))
                    {
                        license = new KendoLicense(type);

                        KendoLicenseProvider.licenseDictionary.Add(type, license);
                    }
                }
            }

            if (license.LicenseStatus == KendoLicenseStatus.Full)
            {
                return license;
            }

            if (license.TrialDaysLeft < 0)
            {
                throw new LicenseException(license.Type);
            }

            return license;
        }
    }
}
