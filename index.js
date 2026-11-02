/**
 * Host half of the Image Zoom bundle.
 *
 * The capability is entirely a browser concern: `client.js` installs a capture
 * phase click handler that takes over content images and draws its own zoomable
 * lightbox. This Host row exists only so the package is a Loader entry whose
 * `dsh.client` declaration the Web boot graph can scan.
 *
 * @module dsh-image-zoom
 */

/** Nothing to install on the Host. */
export function apply() {}
