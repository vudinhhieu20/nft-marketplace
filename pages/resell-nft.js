import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import axios from "axios";
import Web3Modal from "web3modal";

import { marketplaceAddress } from "../config";

import NFTMarketplace from "../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json";

export default function ResellNFT() {
  const [formInput, updateFormInput] = useState({ price: "", image: "" });
  const router = useRouter();
  const { id, tokenURI } = router.query;
  const { image, price } = formInput;
  const [open, setOpen] = useState(false);
  const [checkAuction, setCheckAuction] = useState(false);
  const [buttonText, setButtonText] = useState("Đăng bán sản phẩm");
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    fetchNFT();
  }, [id]);

  async function fetchNFT() {
    if (!tokenURI) return;
    const meta = await axios.get(tokenURI);
    updateFormInput((state) => ({ ...state, image: meta.data.image }));
  }

  async function listNFTForSale() {
    if (!price) return;
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const priceFormatted = ethers.utils.parseUnits(formInput.price, "ether");
    let contract = new ethers.Contract(
      marketplaceAddress,
      NFTMarketplace.abi,
      signer
    );
    let listingPrice = await contract.getListingPrice();

    listingPrice = listingPrice.toString();
    if (checkAuction) {
      let transaction = await contract.reauctionToken(
        id,
        priceFormatted,
        endTime,
        {
          value: listingPrice,
        }
      );
      await transaction.wait();
    } else {
      let transaction = await contract.resellToken(id, priceFormatted, {
        value: listingPrice,
      });
      await transaction.wait();
    }

    checkAuction ? router.push("/auction") : router.push("/");
  }

  const createAuction = (e) => {
    console.log(e.target.checked);
    setOpen(e.target.checked);

    if (e.target.checked) {
      setButtonText("Đấu giá sản phẩm");
      setCheckAuction(true);
    } else {
      setButtonText("Đăng bán sản phẩm");
      setCheckAuction(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Giá sản phẩm (ETH)"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        {image && (
          <img
            className="rounded mt-4"
            width="350"
            src={image}
            alt="NFT image"
          />
        )}

        <div class="flex items-center">
          <input
            // checked
            id="checked-auction"
            type="checkbox"
            value=""
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            onClick={(e) => createAuction(e)}
          ></input>
          <label
            for="checked-auction"
            class="ml-2 text-base font-medium text-gray-900 dark:text-gray-300"
          >
            Đấu giá sản phẩm
          </label>
        </div>

        {open === true && (
          <>
            <div class="m-2"></div>
            <br />

            <p class="text-gray-400">Thời điểm kết thúc đấu giá </p>
            <input
              type="datetime-local"
              className="mt-2 border rounded p-4"
              placeholder={"Thời gian kết thúc"}
              onChange={(e) => {
                const date = new Date(e.target.value);
                console.log(date.getTime());
                setEndTime(date.getTime());
              }}
            />
            <div></div>
            <br />
            {/* <input
              className="mt-2 border rounded p-4"
              placeholder={"Giá khởi điểm"}
            /> */}
            <p class="text-gray-400">
              {" "}
              Khi đấu giá, giá khởi điểm của sản phẩm được đặt bằng giá tiền
            </p>
          </>
        )}

        <button
          onClick={listNFTForSale}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
