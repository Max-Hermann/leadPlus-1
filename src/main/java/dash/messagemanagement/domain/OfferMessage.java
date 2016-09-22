/*******************************************************************************
 * Copyright (c) 2016 Eviarc GmbH.
 * All rights reserved.  
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Eviarc GmbH and its suppliers, if any.  
 * The intellectual and technical concepts contained
 * herein are proprietary to Eviarc GmbH,
 * and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Eviarc GmbH.
 *******************************************************************************/
package dash.messagemanagement.domain;

import java.io.StringWriter;
import java.io.Writer;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnore;

import dash.fileuploadmanagement.domain.FileUpload;
import dash.offermanagement.domain.Offer;
import freemarker.cache.StringTemplateLoader;
import freemarker.template.Configuration;

public class OfferMessage extends AbstractMessage {

	private StringTemplateLoader stringLoader;

	@JsonIgnore
	private Offer offer;

	private String template;
	private FileUpload attachement;

	public OfferMessage(Offer offer, String template) {
		super(offer.getCustomer().getEmail());
		this.stringLoader = new StringTemplateLoader();
		this.offer = offer;
		this.template = template;
		this.attachement = null;
	}

	@Override
	public String getSubject() {
		return "Angebot";
	}

	@Override
	public String getContent() {
		stringLoader.putTemplate("greetTemplate", this.template);

		Configuration cfg = new Configuration();
		cfg.setTemplateLoader(stringLoader);
		Writer writer = new StringWriter();

		freemarker.template.Template template = null;

		try {
			template = cfg.getTemplate("greetTemplate");
			writer = new StringWriter();
			Map mapping = new HashMap();
			mapping.put("titel", String.valueOf(this.offer.getCustomer().getTitle()));
			mapping.put("firstname", String.valueOf(this.offer.getCustomer().getFirstname()));
			mapping.put("lastname", String.valueOf(this.offer.getCustomer().getLastname()));
			mapping.put("deliveryAddress", String.valueOf(this.offer.getDeliveryAddress()));
			mapping.put("offerPrice", String.valueOf(this.offer.getOfferPrice()));
			mapping.put("deliveryDate", String.valueOf(this.offer.getDeliveryDate()));
			template.process(mapping, writer);

		} catch (Exception ex) {
			throw new RuntimeException("Problem rendering email content", ex);
		}

		System.out.println("Template Renderer: " + writer.toString());
		return writer.toString();
	}

}