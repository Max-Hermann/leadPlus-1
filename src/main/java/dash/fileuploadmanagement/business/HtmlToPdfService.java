package dash.fileuploadmanagement.business;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.apache.commons.io.FileUtils;
import org.springframework.stereotype.Service;

import dash.common.HtmlCleaner;
import dash.common.OSValidator;

@Service
public class HtmlToPdfService {

	public static final String PHANTOMJS_ROOT_DIR = getRootPath() + "/phantomjs";
	public static final String PHANTOMJS_ROOT_DIR_OS = PHANTOMJS_ROOT_DIR + "/" + OSValidator.getOS();
	public static final String PHANTOMJS_CONFIG_FILE = PHANTOMJS_ROOT_DIR_OS + "/phantomjs.config.js";
	public static final String PHANTOMJS_EXE = PHANTOMJS_ROOT_DIR_OS + "/phantomjs";
	public static final String TMP_DIR = PHANTOMJS_ROOT_DIR + "/tmp";

	private static String getRootPath() {
		String path = System.getProperty("user.dir").replaceAll("\\\\", "/");
		String className = HtmlToPdfService.class.getName().replace('.', '/');
		String classJar = HtmlToPdfService.class.getResource("/" + className + ".class").toString();
		if (!classJar.startsWith("jar:")) {
			path += "/elb_config";
		}
		return path;
	}

	public synchronized byte[] genereatePdfFromHtml(String htmlStringWithImageInline)
			throws PdfGenerationFailedException, IOException {

		int exitCode = 0;
		BufferedReader errorReader = null;
		BufferedWriter out = null;
		InputStreamReader inputStreamReader = null;
		PrintWriter writer = null;
		File tempHtml = null;
		File tempPdf = null;
		File footerFile = null;
		String errorConsoleOutput = "";
		Process phantom = null;
		List<File> files = null;
		StringBuilder footerHeight = new StringBuilder();
		try {

			files = new ArrayList<>();
			new File(TMP_DIR).mkdirs();

			String tmpFooterId = UUID.randomUUID().toString();
			String tmpFooterPath = TMP_DIR + "/" + tmpFooterId + "tmpFooter.html";

			String htmlString = extractFromText(htmlStringWithImageInline, files, tmpFooterPath, footerHeight);

			String tmpHtmlId = UUID.randomUUID().toString();
			String tmpHtmlPath = TMP_DIR + "/" + tmpHtmlId + "tmpHtml.html";

			out = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(tmpHtmlPath), "UTF-8"));
			out.write(HtmlCleaner.cleanHtmlForPdf(htmlString));
			out.close();

			File configFile = null;
			if (OSValidator.isWindows()) {
				configFile = Paths.get(new URI("file:/" + PHANTOMJS_CONFIG_FILE)).toFile();
				tempHtml = Paths.get(new URI("file:/" + tmpHtmlPath)).toFile();
				footerFile = Paths.get(new URI("file:/" + tmpFooterPath)).toFile();
			} else {
				configFile = Paths.get(new URI("file://" + PHANTOMJS_CONFIG_FILE)).toFile();
				tempHtml = Paths.get(new URI("file://" + tmpHtmlPath)).toFile();
				footerFile = Paths.get(new URI("file://" + tmpFooterPath)).toFile();
			}

			tempPdf = File.createTempFile("tempPdf", ".pdf", new File(TMP_DIR));
			List<String> arguments = new ArrayList<>();
			if (OSValidator.isUnix()) {
				arguments.add("nice");
				arguments.add("-n");
				arguments.add("10");
			}
			arguments.add(PHANTOMJS_EXE);
			arguments.add(configFile.getPath());
			arguments.add(tmpHtmlPath);
			arguments.add(tempPdf.getPath());
			arguments.add(footerFile.getPath());
			arguments.add(footerHeight.toString());
			ProcessBuilder renderProcess = new ProcessBuilder(arguments);
			phantom = renderProcess.start();

			long now = System.currentTimeMillis();
			long timeoutInMillis = 1000L * 20;
			long finish = now + timeoutInMillis;
			while (isAlive(phantom) && (System.currentTimeMillis() < finish)) {
				Thread.sleep(100);
			}
			if (isAlive(phantom)) {
				phantom.destroy();
				throw new InterruptedException("Process timeout");
			}

			exitCode = phantom.waitFor();

			BufferedReader debugReader = new BufferedReader(new InputStreamReader(phantom.getInputStream()));
			StringBuilder debugBuilder = new StringBuilder();
			String debugLine = null;
			while ((debugLine = debugReader.readLine()) != null) {
				debugBuilder.append(debugLine);
				debugBuilder.append(System.getProperty("line.separator"));
			}
			String debugConsoleOutput = debugBuilder.toString();

			inputStreamReader = new InputStreamReader(phantom.getErrorStream());
			errorReader = new BufferedReader(inputStreamReader);
			StringBuilder errorBuilder = new StringBuilder();
			String errorLine = null;
			while ((errorLine = errorReader.readLine()) != null) {
				errorBuilder.append(errorLine);
				errorBuilder.append(System.getProperty("line.separator"));
			}
			errorConsoleOutput = errorBuilder.toString();

			Path path = Paths.get(tempPdf.getAbsolutePath());
			if (exitCode != 0) {
				throw new InterruptedException("PhatomJS timeout");
			}
			return Files.readAllBytes(path);
		} catch (Exception e) {
			if (exitCode != 0) {
				throw new PdfGenerationFailedException("PdfGenerator exited with Code " + exitCode);
			}
			e.printStackTrace();
			throw new PdfGenerationFailedException("PdfGenerator exited:" + e.getMessage() + errorConsoleOutput);
		} finally {
			if (inputStreamReader != null) {
				inputStreamReader.close();
			}
			if (errorReader != null) {
				errorReader.close();
			}
			if (writer != null) {
				writer.close();
			}
			if (tempHtml != null) {
				tempHtml.delete();
			}
			if (footerFile != null) {
				footerFile.delete();
			}
			if (tempPdf != null) {
				tempPdf.delete();
			}
			if (phantom != null) {
				phantom.destroy();
			}
			if (files != null) {
				files.stream().filter(f -> f != null).forEach(f -> f.delete());
			}
		}

	}

	private static boolean isAlive(Process p) {
		try {
			p.exitValue();
			return false;
		} catch (IllegalThreadStateException e) {
			return true;
		}
	}

	private String extractFromText(String oldHtml, List<File> files, String footer, StringBuilder footerHeight)
			throws IOException {
		StringBuilder newContentBuilder = new StringBuilder();

		for (int i = 0; i < oldHtml.length(); i++) {
			// extract src Tags
			if (hasKeyword(oldHtml, "src", i)) {
				File tmpImage = File.createTempFile("tmpImage", ".png", new File(TMP_DIR));
				i = extractImage(oldHtml, tmpImage, i);
				newContentBuilder.append("src=\"file:///" + tmpImage.getAbsolutePath().replaceAll("\\\\", "/") + "\"");
				files.add(tmpImage);
				continue;
			}
			// extract footer
			if (hasKeyword(oldHtml, "<footer", i)) {
				i = extractFooter(oldHtml, footer, i, footerHeight);
				continue;
			}
			newContentBuilder.append(oldHtml.charAt(i));

		}
		return newContentBuilder.toString();
	}

	private boolean hasKeyword(String text, String keyword, int start) {
		if (text.length() < start + keyword.length()) {
			return false;
		}
		for (int i = 0; i < keyword.length(); i++) {
			if (text.charAt(start + i) != keyword.charAt(i)) {
				return false;
			}
		}
		return true;
	}

	private int extractImage(String text, File image, int i) throws IOException {

		for (; i < text.length() && text.charAt(i) != ','; i++) {
		}
		StringBuilder currentBase64ImageStringBuilder = new StringBuilder();
		for (; i < text.length() && text.charAt(i) != '"'; i++) {
			currentBase64ImageStringBuilder.append(text.charAt(i));
		}
		byte[] imageAsByteArray = org.apache.commons.codec.binary.Base64
				.decodeBase64(currentBase64ImageStringBuilder.toString().getBytes());
		FileUtils.writeByteArrayToFile(image, imageAsByteArray);
		return i++;
	}

	private int extractFooter(String text, String footerPath, int i, StringBuilder footerHeight) throws IOException {
		StringBuilder footer = new StringBuilder();
		boolean isInFooterHeight = false;
		for (; i < text.length(); i++) {
			if (hasKeyword(text, ">", i)) {
				i += 1;
				break;
			}
			if (hasKeyword(text, "height=\"", i)) {
				i += 8;
				isInFooterHeight = true;
			}
			if (hasKeyword(text, "\"", i)) {
				i += 1;
				isInFooterHeight = false;
			}
			if (isInFooterHeight) {
				footerHeight.append(text.charAt(i));
			}
		}

		for (; i < text.length(); i++) {
			if (hasKeyword(text, "</footer>", i)) {
				BufferedWriter out = new BufferedWriter(
						new OutputStreamWriter(new FileOutputStream(footerPath), "UTF-8"));
				out.write(HtmlCleaner.cleanHtmlForPdf(footer.toString()));
				out.close();
				return i + 8;
			}
			footer.append(text.charAt(i));
		}
		return i;
	}

}
