﻿using System.Collections.Generic;
using Microsoft.AspNet.Razor.TagHelpers;
using Microsoft.AspNet.Mvc.ViewFeatures;
using Microsoft.AspNet.Mvc.Rendering;
using Kendo.Mvc.Rendering;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.Infrastructure;

namespace Kendo.Mvc.TagHelpers
{
    public abstract class TagHelperBase : TagHelper
    {
        [HtmlAttributeNotBound]
        [ViewContext]
        public ViewContext ViewContext { get; set; }

        [HtmlAttributeNotBound]
        protected IKendoHtmlGenerator Generator { get; set; }

        [HtmlAttributeNotBound]
        public IJavaScriptInitializer Initializer { get; set; }

        public string Name { get; set; }

        [HtmlAttributeNotBound]
        public string Id { get; set; }

        public string Selector
        {
            get
            {
                return IdPrefix + Id;
            }
        }

        public string IdPrefix
        {
            get
            {
                return "#";
            }
        }

        public TagHelperBase(IKendoHtmlGenerator generator)
        {
            Generator = generator;

            Initializer = new JavaScriptInitializer();
        }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            WriteHtml(output);

            WriteInitializationScript(output);
        }
        protected abstract void WriteHtml(TagHelperOutput output);

        protected abstract void WriteInitializationScript(TagHelperOutput output);

        protected virtual Dictionary<string, object> SerializeSettings()
        {
            var settings = SerializeEvents();

            return settings;
        }

        protected abstract Dictionary<string, object> SerializeEvents();

        protected void GenerateId(TagHelperOutput output)
        {
            Id = Generator.SanitizeId(output.Attributes.ContainsName("id") ? (string)output.Attributes["id"].Value : ViewContext.GetFullHtmlFieldName(Name));
        }

        protected ClientHandlerDescriptor CreateHandler(string handler)
        {
            return new ClientHandlerDescriptor { HandlerName = handler };
        }
    }
}
